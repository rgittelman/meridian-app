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
import type { CurrentRegion } from '@/store/locationStore';
import type { TrafficEstimate } from '@/services/location/trafficIntelligence';
import { isHouseholdRelevant } from '@/services/relevance';
import { filterEventsForPlan } from '@/services/calendar/eventFilters';
import { buildCandidate, dayKey, peopleForEvent, stripPersonPrefixFromTitle } from './candidateHelpers';
import { safeTrim } from '@/utils/safeString';

/**
 * Location context passed in from Phase G.2.
 * Optional — when absent or region is not 'home', falls back to Phase E copy.
 */
export type LeaveAlertLocationContext = {
  currentRegion: CurrentRegion;
  smartLeaveTimingEnabled: boolean;
};

/** Minutes before event start to fire the leave alert when no traffic data is available. */
export const LEAVE_ALERT_MINUTES_BEFORE = 30;

/**
 * Buffer added to trafficMinutes when computing the traffic-aware alert fire time.
 * Accounts for preparation time (getting keys, getting to the car).
 * Total advance notice = trafficMinutes + LEAVE_ALERT_BUFFER_MINUTES.
 */
export const LEAVE_ALERT_BUFFER_MINUTES = 10;

/** Phase H.2 secondary line when traffic is heavier than usual. */
export const LEAVE_ALERT_TRAFFIC_SECONDARY = 'Traffic is heavier than usual today.';

/** Generation window: only create candidates within this many minutes of the alert fire time. */
const GENERATION_WINDOW_MINUTES = 60;

/** Width of the OS scheduling window in minutes — keeps dedupe keys stable. */
const ALERT_WINDOW_WIDTH_MINUTES = 5;

/**
 * Computes the alert fire time in milliseconds.
 * When a traffic estimate is available, uses trafficMinutes + buffer.
 * Falls back to the fixed T-30 when no estimate is present.
 */
export function computeAlertFireMs(
  startMs: number,
  estimate: TrafficEstimate | undefined,
): number {
  if (!estimate) {
    return startMs - LEAVE_ALERT_MINUTES_BEFORE * 60 * 1000;
  }
  return startMs - (estimate.trafficMinutes + LEAVE_ALERT_BUFFER_MINUTES) * 60 * 1000;
}

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

/**
 * Phase G.2 — location-aware primary line.
 * Only used when currentRegion === 'home' && smartLeaveTimingEnabled === true.
 *
 * "Grace's volleyball practice starts at 2:30 PM."
 * "BFSC board meeting starts at 7:00 PM."
 */
export function leaveAlertLocationAwarePrimaryLine(event: MeridianCalendarEvent): string {
  const rawTitle = safeTrim(event.displayTitle ?? event.title, 'Your commitment');
  const people = peopleForEvent(event);
  const person = people[0];
  const time = event.displayTime;

  if (person) {
    const activity = stripPersonPrefixFromTitle(rawTitle, person);
    return `${person}'s ${activity} starts at ${time}.`;
  }
  return `${rawTitle} starts at ${time}.`;
}

/** Phase G.2 — location-aware secondary line. Constant for all home-region alerts. */
export const LEAVE_ALERT_LOCATION_AWARE_SECONDARY =
  'Leaving in the next 15 minutes gives you breathing room.';

/**
 * Returns true when location-aware copy should be used.
 * Only fires at home with smart leave timing enabled.
 */
export function shouldUseLocationAwareCopy(
  locationContext: LeaveAlertLocationContext | undefined,
): boolean {
  if (!locationContext) return false;
  return (
    locationContext.currentRegion === 'home' && locationContext.smartLeaveTimingEnabled === true
  );
}

export function generateLeaveAlertCandidates(
  events: MeridianCalendarEvent[],
  now = new Date(),
  locationContext?: LeaveAlertLocationContext,
  trafficContext?: Record<string, TrafficEstimate>,
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
    const trafficEstimate = trafficContext?.[event.id];
    const alertFireMs = computeAlertFireMs(startMs, trafficEstimate);
    const minutesUntilAlert = (alertFireMs - nowMs) / 60_000;

    // Only generate when the alert fire time is within the generation window
    // and has not already passed.
    if (minutesUntilAlert < 0 || minutesUntilAlert > GENERATION_WINDOW_MINUTES) continue;

    // 5-minute OS scheduling window around the alert fire time.
    const windowStart = new Date(alertFireMs);
    const windowEnd = new Date(alertFireMs + ALERT_WINDOW_WIDTH_MINUTES * 60 * 1000);

    const useLocationCopy = shouldUseLocationAwareCopy(locationContext);

    let primaryLine: string;
    let secondaryLine: string | null;

    if (useLocationCopy) {
      primaryLine = leaveAlertLocationAwarePrimaryLine(event);
      secondaryLine = trafficEstimate?.isHeavierThanUsual
        ? LEAVE_ALERT_TRAFFIC_SECONDARY
        : LEAVE_ALERT_LOCATION_AWARE_SECONDARY;
    } else {
      primaryLine = leaveAlertPrimaryLine(event);
      secondaryLine = null;
    }

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
        primaryLine,
        secondaryLine,
        additionalLines: [],
        timingSensitivity: 'high',
        conflictRisk: 0,
        prepRelevance: 0,
      }),
    );
  }

  return candidates;
}
