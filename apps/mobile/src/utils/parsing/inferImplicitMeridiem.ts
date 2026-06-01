/**
 * Infer am/pm when capture text omits meridiem (e.g. "at 6", "Friday at 5:15").
 * Conservative defaults for Ryan daily-driver phrasing.
 */
export function inferImplicitMeridiem(
  hour: number,
  minute: number,
): 'am' | 'pm' {
  if (minute > 0 && hour >= 1 && hour <= 7) return 'pm';
  if (hour >= 1 && hour <= 6) return 'pm';
  if (hour >= 10 && hour <= 11) return 'am';
  if (hour === 9) return 'am';
  if (hour === 8) return 'am';
  if (hour === 12) return 'pm';
  return 'pm';
}
