import type { LifeObject } from '@/types/capture';

const DAY_NAMES: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

/**
 * Extracts a day-of-week index (0–6) from the item's timing label.
 * Used to anchor weekly recurrence to the event day when daysOfWeek is empty.
 */
function anchorDayFromTiming(obj: LifeObject): number | null {
  const label = (obj.parse.timing?.value.label ?? '').toLowerCase();
  for (const [name, idx] of Object.entries(DAY_NAMES)) {
    if (label.includes(name)) return idx;
  }
  return null;
}

/**
 * Extracts a day-of-month (1–31) from the item's timing label.
 * Matches patterns like "the 15th", "on the 1st", bare ordinal numbers.
 */
function monthlyAnchorDay(obj: LifeObject): number | null {
  const label = obj.parse.timing?.value.label ?? '';
  const match = label.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/);
  if (match) {
    const d = parseInt(match[1], 10);
    if (d >= 1 && d <= 31) return d;
  }
  return null;
}

/**
 * Whether a monthly-cadence item should surface today.
 * - If a day-of-month anchor is parseable: surface on that day and the day before.
 * - If no anchor: conservative fallback — last 3 days of the month.
 */
function shouldSurfaceMonthly(obj: LifeObject, now: Date): boolean {
  const anchor = monthlyAnchorDay(obj);
  const date = now.getDate();

  if (anchor !== null) {
    return date === anchor || date === anchor - 1;
  }

  // No anchor: only surface near end of month so it doesn't spam daily.
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return date >= lastDay - 2;
}

/**
 * Recurring Life Objects resurface on their scheduled days (and the evening before
 * for weekly commitments).
 */
export function shouldSurfaceRecurringCapture(
  obj: LifeObject,
  now = new Date(),
): boolean {
  const recurrence = obj.recurrence;
  if (!recurrence) return true;

  const day = now.getDay();
  const hour = now.getHours();

  if (recurrence.daysOfWeek.length === 0) {
    if (recurrence.cadence === 'daily') return true;
    if (recurrence.cadence === 'weekly') {
      // Prefer the day name from timing label over creation day as the anchor.
      // "Bring skates every week" captured Monday but labelled Tuesday should
      // surface Tuesday/Monday-evening, not Monday/Sunday-evening.
      const anchor = anchorDayFromTiming(obj) ?? obj.createdAt.getDay();
      if (day === anchor) return true;
      const prev = (anchor + 6) % 7;
      return day === prev && hour >= 18;
    }
    if (recurrence.cadence === 'monthly') {
      return shouldSurfaceMonthly(obj, now);
    }
    return false;
  }

  if (recurrence.daysOfWeek.includes(day)) return true;

  const eveningBefore = recurrence.daysOfWeek.some(
    (d) => d === (day + 1) % 7,
  );
  if (eveningBefore && hour >= 18) return true;

  return false;
}
