import type { MeridianCalendarEvent } from '@/types/calendar';
import { isHouseholdRelevant } from '@/services/relevance';
import { EVENING_WIND_DOWN_WINDOW } from './constants';
import {
  buildCandidate,
  dayKey,
  isWithinLocalHourWindow,
  windowForLocalHours,
} from './candidateHelpers';
import type { NotificationCandidate } from '@/types/notification';
import type { NotificationGeneratorOptions } from './generatorOptions';

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function tomorrowEvents(
  events: MeridianCalendarEvent[],
  from: Date,
): MeridianCalendarEvent[] {
  const tomorrow = new Date(startOfDay(from));
  tomorrow.setDate(tomorrow.getDate() + 1);
  const key = startOfDay(tomorrow).toISOString();
  return events
    .filter((e) => startOfDay(e.startTime).toISOString() === key)
    .filter((e) => e.signalClassification === 'meaningful')
    .filter(isHouseholdRelevant);
}

/**
 * Evening wind-down — future-facing only; reduces tomorrow's pressure.
 */
export function generateEveningWindDownCandidates(
  events: MeridianCalendarEvent[],
  now = new Date(),
  options?: NotificationGeneratorOptions,
): NotificationCandidate[] {
  const inWindow = isWithinLocalHourWindow(
    now,
    EVENING_WIND_DOWN_WINDOW.startHour,
    EVENING_WIND_DOWN_WINDOW.endHour,
  );
  if (!inWindow && !options?.bypassDeliveryWindow) {
    return [];
  }

  const tomorrow = tomorrowEvents(events, now);
  if (tomorrow.length === 0) return [];

  const heavyDay = tomorrow.length >= 4;
  const { start, end } = inWindow
    ? windowForLocalHours(
        now,
        EVENING_WIND_DOWN_WINDOW.startHour,
        EVENING_WIND_DOWN_WINDOW.endHour,
      )
    : {
        start: now,
        end: new Date(now.getTime() + 2 * 60 * 60 * 1000),
      };
  const key = dayKey(now);

  const primaryLine = heavyDay
    ? 'Tomorrow looks full.'
    : tomorrow.length >= 2
      ? 'A few commitments tomorrow.'
      : 'Something on the calendar tomorrow.';

  const secondaryLine = heavyDay
    ? 'One small thing tonight may ease the morning.'
    : null;

  const additionalLines = tomorrow
    .slice(0, 3)
    .map((e) => e.displayTitle ?? e.title)
    .filter(Boolean);

  return [
    buildCandidate({
      id: `evening-wind-down-${key}`,
      type: 'evening_wind_down',
      event: tomorrow[0],
      generatedAt: now,
      windowStart: start,
      windowEnd: end,
      confidence: 'medium',
      interruptionReason: 'Reduce pressure before tomorrow.',
      bundleKey: `evening-wind-down-${key}`,
      primaryLine,
      secondaryLine,
      additionalLines,
      householdImpact: heavyDay ? 'high' : 'medium',
      timingSensitivity: 'medium',
    }),
  ];
}
