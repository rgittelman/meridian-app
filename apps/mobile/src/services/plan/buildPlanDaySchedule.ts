import type { MeridianCalendarEvent } from '@/types/calendar';
import type { PlanDayScheduleItem, PlanPromotedCapture } from '@/types/plan';
import { logPlanMergedCount, logPlanPromotionDeduped } from './planDebug';

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** At most one promoted row per sourceCaptureId per day column. */
function capturesForDay(
  day: Date,
  captures: PlanPromotedCapture[],
): PlanPromotedCapture[] {
  const key = startOfDay(day).toISOString();
  const seenSourceIds = new Set<string>();
  const dayCaptures: PlanPromotedCapture[] = [];

  for (const capture of captures) {
    if (startOfDay(capture.plannedStartTime).toISOString() !== key) continue;
    if (seenSourceIds.has(capture.sourceCaptureId)) {
      logPlanPromotionDeduped(capture.sourceCaptureId, 'skipped_duplicate_day_row');
      continue;
    }
    seenSourceIds.add(capture.sourceCaptureId);
    dayCaptures.push(capture);
  }

  return dayCaptures;
}

export type PlanDayColumns = {
  events: MeridianCalendarEvent[];
  captures: PlanPromotedCapture[];
};

/** Calendar commitments first; captured intentions grouped below (not timeline peers). */
export function buildPlanDayColumns(
  day: Date,
  events: MeridianCalendarEvent[],
  captures: PlanPromotedCapture[],
): PlanDayColumns {
  const key = startOfDay(day).toISOString();

  const dayEvents = events
    .filter((e) => startOfDay(e.startTime).toISOString() === key)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  const dayCaptures = capturesForDay(day, captures).sort(
    (a, b) => a.plannedStartTime.getTime() - b.plannedStartTime.getTime(),
  );

  logPlanMergedCount(dayEvents.length, dayCaptures.length, key);

  return { events: dayEvents, captures: dayCaptures };
}

/** @deprecated Prefer buildPlanDayColumns — chronological merge kept for tests. */
export function buildPlanItemsForDay(
  day: Date,
  events: MeridianCalendarEvent[],
  captures: PlanPromotedCapture[],
): PlanDayScheduleItem[] {
  const { events: dayEvents, captures: dayCaptures } = buildPlanDayColumns(
    day,
    events,
    captures,
  );

  const items: PlanDayScheduleItem[] = [
    ...dayEvents.map((event) => ({
      kind: 'event' as const,
      startTime: event.startTime,
      event,
    })),
    ...dayCaptures.map((capture) => ({
      kind: 'capture' as const,
      startTime: capture.plannedStartTime,
      capture,
    })),
  ];

  return items.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}
