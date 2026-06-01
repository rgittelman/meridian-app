/** Human timing fragments for life previews — calm, not metric-like. */
export function relativeTimingLabel(startTime: Date | null, now = new Date()): string | null {
  if (!startTime) return null;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eventDay = new Date(
    startTime.getFullYear(),
    startTime.getMonth(),
    startTime.getDate(),
  );
  const diffDays = Math.round((eventDay.getTime() - today.getTime()) / 86_400_000);
  const hoursUntil = (startTime.getTime() - now.getTime()) / 3_600_000;

  if (diffDays === 0) {
    if (hoursUntil <= 0) return 'now';
    if (hoursUntil < 5) return 'soon';
    if (hoursUntil < 12) return 'this morning';
    if (hoursUntil < 17) return 'this afternoon';
    return 'tonight';
  }
  if (diffDays === 1) return 'tomorrow';
  if (diffDays > 1 && diffDays < 7) {
    return startTime.toLocaleDateString(undefined, { weekday: 'long' }).toLowerCase();
  }
  if (diffDays >= 7 && diffDays < 14) return 'next week';
  return null;
}

export function buildPreviewPhrase(title: string, timingLabel: string | null): string {
  const safe = title.trim();
  if (!timingLabel) return safe;
  if (safe.toLowerCase().includes(timingLabel)) return safe;
  return `${safe} ${timingLabel}`;
}
