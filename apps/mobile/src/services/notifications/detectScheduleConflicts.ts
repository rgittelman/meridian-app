import type { MeridianCalendarEvent } from '@/types/calendar';
import { filterEventsForPlan } from '@/services/calendar/eventFilters';
import { isHouseholdRelevant } from '@/services/relevance';
import { safeTrim } from '@/utils/safeString';

export type ScheduleConflict = {
  id: string;
  eventA: MeridianCalendarEvent;
  eventB: MeridianCalendarEvent;
  overlapMinutes: number;
  description: string;
};

const MIN_TIMED_OVERLAP_MINUTES = 15;

function sameCalendarDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

function timedOverlapMinutes(a: MeridianCalendarEvent, b: MeridianCalendarEvent): number {
  const start = Math.max(a.startTime.getTime(), b.startTime.getTime());
  const end = Math.min(a.endTime.getTime(), b.endTime.getTime());
  return Math.max(0, Math.round((end - start) / 60_000));
}

function eventLabel(e: MeridianCalendarEvent): string {
  return safeTrim(e.displayTitle ?? e.title, 'Commitment');
}

function calmConflictLine(a: MeridianCalendarEvent, b: MeridianCalendarEvent): string {
  const labelA = eventLabel(a);
  const labelB = eventLabel(b);
  const personA = a.displayPersonLabel ?? a.inferredOwnerLabel;
  const personB = b.displayPersonLabel ?? b.inferredOwnerLabel;

  if (personA && personB && personA !== personB) {
    return `${labelA} overlaps ${labelB}.`;
  }
  return `${labelA} may overlap with ${labelB}.`;
}

function hasCommitmentWeight(event: MeridianCalendarEvent): boolean {
  const impact = event.relevance?.householdImpact ?? 'none';
  return (
    isHouseholdRelevant(event) &&
    (impact === 'high' ||
      impact === 'medium' ||
      event.timingSensitivity === 'high' ||
      event.peopleImpact === 'HIGH' ||
      event.peopleImpact === 'VERY_HIGH')
  );
}

/**
 * Genuine overlapping commitments only — not adjacent blocks or same-day all-day clutter.
 */
export function isGenuineScheduleConflict(
  eventA: MeridianCalendarEvent,
  eventB: MeridianCalendarEvent,
): boolean {
  if (!hasCommitmentWeight(eventA) || !hasCommitmentWeight(eventB)) {
    return false;
  }

  const aAllDay = eventA.allDay;
  const bAllDay = eventB.allDay;

  if (aAllDay && bAllDay) {
    return false;
  }

  if (aAllDay || bAllDay) {
    const allDay = aAllDay ? eventA : eventB;
    const timed = aAllDay ? eventB : eventA;
    if (!sameCalendarDay(allDay.startTime, timed.startTime)) return false;
    return timed.timingSensitivity === 'high' || hasCommitmentWeight(timed);
  }

  const minutes = timedOverlapMinutes(eventA, eventB);
  return minutes >= MIN_TIMED_OVERLAP_MINUTES;
}

/**
 * Detect real schedule conflicts among meaningful household commitments.
 */
export function detectScheduleConflicts(
  events: MeridianCalendarEvent[],
  now = Date.now(),
): ScheduleConflict[] {
  const candidates = filterEventsForPlan(events).filter(
    (e) => e.endTime.getTime() >= now && e.signalClassification === 'meaningful',
  );

  const conflicts: ScheduleConflict[] = [];

  for (let i = 0; i < candidates.length; i += 1) {
    for (let j = i + 1; j < candidates.length; j += 1) {
      const eventA = candidates[i];
      const eventB = candidates[j];
      if (!isGenuineScheduleConflict(eventA, eventB)) continue;

      const overlapMinutes =
        eventA.allDay || eventB.allDay
          ? 0
          : timedOverlapMinutes(eventA, eventB);

      conflicts.push({
        id: `conflict-${eventA.id}-${eventB.id}`,
        eventA,
        eventB,
        overlapMinutes,
        description: calmConflictLine(eventA, eventB),
      });
    }
  }

  return conflicts.sort((a, b) => b.overlapMinutes - a.overlapMinutes);
}
