/**
 * Plan view time window — today forward only, never past days.
 */

export type PlanForwardBounds = {
  timeMin: string;
  timeMax: string;
  todayStartMs: number;
  planEndMs: number;
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date): Date {
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return end;
}

/** Preferred: today + 7 days; minimum: today through end of calendar week (Sunday). */
export function planForwardBounds(reference = new Date()): PlanForwardBounds {
  const today = startOfDay(reference);

  const sevenDaysOut = endOfDay(new Date(today));
  sevenDaysOut.setDate(today.getDate() + 7);

  const dayOfWeek = today.getDay();
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const weekEnd = endOfDay(new Date(today));
  weekEnd.setDate(today.getDate() + daysUntilSunday);

  const planEnd = sevenDaysOut.getTime() >= weekEnd.getTime() ? sevenDaysOut : weekEnd;

  return {
    timeMin: today.toISOString(),
    timeMax: planEnd.toISOString(),
    todayStartMs: today.getTime(),
    planEndMs: planEnd.getTime(),
  };
}

/** Day columns for Plan — starts today, no past days. */
export function getPlanForwardDays(reference = new Date()): Date[] {
  const { todayStartMs, planEndMs } = planForwardBounds(reference);
  const days: Date[] = [];
  const cursor = new Date(todayStartMs);

  while (cursor.getTime() <= planEndMs) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

export function isEventInPlanWindow(
  event: { startTime: Date; endTime: Date },
  reference = new Date(),
): boolean {
  const { todayStartMs, planEndMs } = planForwardBounds(reference);
  return (
    event.endTime.getTime() >= todayStartMs &&
    event.startTime.getTime() <= planEndMs
  );
}
