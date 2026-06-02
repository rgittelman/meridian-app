/**
 * Leave alert generator — Phase E.
 *
 * Fires 30 minutes before each household-relevant calendar event.
 * Time-based only: no geolocation, no traffic, no ETA calculation.
 * Those belong to Phase G (Geolocation) and Phase H (Traffic-Aware Routing).
 *
 * Candidate design:
 * - One candidate per eligible event per day.
 * - Window is a 5-minute slot centred on T-30 so the OS scheduler has a
 *   narrow target and duplicate-prevention keys stay stable.
 * - Primary line always names the commitment:
 *     "Grace's volleyball practice starts in 30 minutes."
 *     "BFSC board meeting starts in 30 minutes."
 * - No secondary line — context-free by design for Phase E.
 * - All-day events are excluded (no clock time to count down from).
 * - Events already started or more than 90 minutes away are excluded.
 */

import type { MeridianCalendarEvent } from '@/types/calendar';
import type { NotificationCandidate } from '@/types/notification';
import { isHouseholdRelevant } from '@/services/relevance';
import { filterEventsForPlan } from '@/services/calendar/eventFilters';
import { buildCandidate, dayKey, peopleForEvent } from './candidateHelpers';
import { safeTrim } from '@/utils/safeString';

/** Minutes before event start to fire the leave alert. */
export const LEAVE_ALERT_MINUTES_BEFORE = 30;

/** Generation window: only create candidates within this many minutes of the alert fire time. */
const GENERATION_WINDOW_MINUTES = 60;

/** Width of the OS scheduling window in minutes — keeps dedupe keys stable. */
const ALERT_WINDOW_WIDTH_MINUTES = 5;

/**
 * Builds the primary notification line for a leave alert.
 * Always names the commitment specifically — never generic copy.
 *
 * "Grace's volleyball practice starts in 30 minutes."
 * "BFSC board meeting starts in 30 minutes."
 */
export function leaveAlertPrimaryLine(event: MeridianCalendarEvent): string {
  const rawTitle = safeTrim(event.displayTitle ?? event.title, 'Your commitment');
  const people = peopleForEvent(event);
  const person = people[0];

  if (person) {
    // Strip the person name from the front of the title to avoid
    // "Grace's Grace volleyball practice" when the title is already
    // "Grace volleyball practice".
    const namePrefix = new RegExp(`^${person}\\s+`, 'i');
    const activity = rawTitle.replace(namePrefix, '');
    return `${person}'s ${activity} starts in ${LEAVE_ALERT_MINUTES_BEFORE} minutes.`;
  }
  return `${rawTitle} starts in ${LEAVE_ALERT_MINUTES_BEFORE} minutes.`;
}

export function generateLeaveAlertCandidates(
  events: MeridianCalendarEvent[],
  now = new Date(),
): NotificationCandidate[] {
  const candidates: NotificationCandidate[] = [];
  const planEvents = filterEventsForPlan(events);
  const nowMs = now.getTime();

  for (const event of planEvents) {
    // Skip all-day events — no clock time to count down from.
    if (event.allDay) continue;

    // Skip events that are not household-relevant.
    if (!isHouseholdRelevant(event)) continue;

    const startMs = event.startTime.getTime();
    const alertFireMs = startMs - LEAVE_ALERT_MINUTES_BEFORE * 60 * 1000;
    const minutesUntilAlert = (alertFireMs - nowMs) / 60_000;

    // Only generate when the alert fire time is within the generation window
    // and has not already passed.
    if (minutesUntilAlert < 0 || minutesUntilAlert > GENERATION_WINDOW_MINUTES) continue;

    // 5-minute OS scheduling window around the alert fire time.
    const windowStart = new Date(alertFireMs);
    const windowEnd = new Date(alertFireMs + ALERT_WINDOW_WIDTH_MINUTES * 60 * 1000);

    candidates.push(
      buildCandidate({
        id: `leave-alert-${event.id}-${dayKey(now)}`,
        type: 'leave_alert',
        event,
        generatedAt: now,
        windowStart,
        windowEnd,
        confidence: 'high',
        interruptionReason: 'Commitment starting soon — time to leave or prepare.',
        bundleKey: `leave-alert-${event.id}-${dayKey(now)}`,
        primaryLine: leaveAlertPrimaryLine(event),
        secondaryLine: null,
        additionalLines: [],
        timingSensitivity: 'high',
        conflictRisk: 0,
        prepRelevance: 0,
      }),
    );
  }

  return candidates;
}
