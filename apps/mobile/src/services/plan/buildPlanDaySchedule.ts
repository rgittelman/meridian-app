import type { MeridianCalendarEvent } from '@/types/calendar';
import type { PlanDayScheduleItem, PlanPromotedCapture } from '@/types/plan';
import { logPlanMergedCount, logPlanPromotionDeduped } from './planDebug';

/**
 * Grace window after a capture's planned start time before it is considered expired.
 * Gives the user a short buffer — e.g. a 6:15 AM event still shows until ~6:30 AM.
 */
const PLAN_CAPTURE_EXPIRY_GRACE_MS = 15 * 60_000; // 15 minutes

/**
 * Removes promoted captures that have already passed their planned time.
 *
 * Rules:
 * - Only 'exact' placement captures expire by clock time; soft-day captures
 *   span the entire day and are never expired mid-day by this filter.
 * - 'held' captures are exempt — the user explicitly parked them.
 * - Recurring captures are rejected before promotion, so none reach this filter.
 * - No storage mutation — this is a pure display filter only.
 */
export function filterActivePlanCaptures(
  captures: PlanPromotedCapture[],
  now: Date,
): PlanPromotedCapture[] {
  const nowMs = now.getTime();
  return captures.filter((c) => {
    if (c.status === 'held') return true;
    if (c.placementTier !== 'exact') return true;
    return c.plannedStartTime.getTime() + PLAN_CAPTURE_EXPIRY_GRACE_MS > nowMs;
  });
}

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

/**
 * Calendar commitments first; captured intentions grouped below (not timeline peers).
 *
 * @param now - Reference time for expiry filtering (defaults to Date.now()).
 *              Pass explicitly in tests for deterministic results.
 */
export function buildPlanDayColumns(
  day: Date,
  events: MeridianCalendarEvent[],
  captures: PlanPromotedCapture[],
  now = new Date(),
): PlanDayColumns {
  const key = startOfDay(day).toISOString();

  const dayEvents = events
    .filter((e) => startOfDay(e.startTime).toISOString() === key)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const activeCaptures = filterActivePlanCaptures(captures, now);
  const dayCaptures = capturesForDay(day, activeCaptures).sort(
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
