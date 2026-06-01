import type { LifeObject } from '@/types/capture';

/**
 * Recurring Life Objects resurface on their scheduled days (and the evening before
 * for weekly Monday commitments).
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
      const anchor = obj.createdAt.getDay();
      if (day === anchor) return true;
      const prev = (anchor + 6) % 7;
      return day === prev && hour >= 18;
    }
    return recurrence.cadence === 'monthly';
  }

  if (recurrence.daysOfWeek.includes(day)) return true;

  const eveningBefore = recurrence.daysOfWeek.some(
    (d) => d === (day + 1) % 7,
  );
  if (eveningBefore && hour >= 18) return true;

  return false;
}
