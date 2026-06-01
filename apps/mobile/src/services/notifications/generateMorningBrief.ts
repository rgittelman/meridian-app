import type { MeridianCalendarEvent } from '@/types/calendar';
import { filterEventsForPlan } from '@/services/calendar/eventFilters';
import { isHouseholdRelevant } from '@/services/relevance';
import {
  MORNING_BRIEF_WINDOW,
} from './constants';
import {
  buildCandidate,
  commitmentBriefLine,
  dayKey,
  isWithinLocalHourWindow,
  windowForLocalHours,
} from './candidateHelpers';
import type { NotificationCandidate } from '@/types/notification';
import type { NotificationGeneratorOptions } from './generatorOptions';

const MAX_BRIEF_COMMITMENTS = 4;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function eventsForDay(events: MeridianCalendarEvent[], day: Date): MeridianCalendarEvent[] {
  const key = startOfDay(day).toISOString();
  return events
    .filter(
      (e) =>
        startOfDay(e.startTime).toISOString() === key &&
        e.signalClassification === 'meaningful' &&
        isHouseholdRelevant(e),
    )
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}

/**
 * One morning brief candidate per morning window — commitment-centered, no task counts.
 */
export function generateMorningBriefCandidates(
  events: MeridianCalendarEvent[],
  now = new Date(),
  options?: NotificationGeneratorOptions,
): NotificationCandidate[] {
  const inWindow = isWithinLocalHourWindow(
    now,
    MORNING_BRIEF_WINDOW.startHour,
    MORNING_BRIEF_WINDOW.endHour,
  );
  if (!inWindow && !options?.bypassDeliveryWindow) {
    return [];
  }

  const today = startOfDay(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayEvents = eventsForDay(events, today);
  const tomorrowEvents = eventsForDay(events, tomorrow);
  const lines: string[] = [];

  for (const e of todayEvents) {
    if (lines.length >= MAX_BRIEF_COMMITMENTS) break;
    lines.push(commitmentBriefLine(e));
  }

  for (const e of tomorrowEvents) {
    if (lines.length >= MAX_BRIEF_COMMITMENTS) break;
    if (lines.some((l) => l.includes(e.displayTitle ?? e.title))) continue;
    lines.push(commitmentBriefLine(e));
  }

  if (lines.length === 0) return [];

  const { start, end } = inWindow
    ? windowForLocalHours(now, MORNING_BRIEF_WINDOW.startHour, MORNING_BRIEF_WINDOW.endHour)
    : {
        start: now,
        end: new Date(now.getTime() + 3 * 60 * 60 * 1000),
      };
  const key = dayKey(now);

  return [
    buildCandidate({
      id: `morning-brief-${key}`,
      type: 'morning_brief',
      event: todayEvents[0] ?? tomorrowEvents[0] ?? null,
      generatedAt: now,
      windowStart: start,
      windowEnd: end,
      confidence: 'high',
      interruptionReason: 'Orient to the shape of the day ahead.',
      bundleKey: `morning-brief-${key}`,
      primaryLine: lines[0],
      secondaryLine: null,
      additionalLines: lines.slice(1),
      householdImpact: 'medium',
      timingSensitivity: 'medium',
    }),
  ];
}
