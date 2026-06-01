import { safeLower, safeTrim } from '@/utils/safeString';

export function isSchoolCalendarSource(
  sourceCalendarName: string,
  displayLabel?: string,
): boolean {
  const name = safeLower(sourceCalendarName);
  const label = safeLower(displayLabel ?? '');

  if (name.includes('@') && name.includes('rcs')) return true;
  if (name.includes('rcs') || name.includes('cherry hill') || name.includes('cherryhill')) {
    return true;
  }
  if (
    name.includes('school') ||
    name.includes('classroom') ||
    name.includes('pta') ||
    name.includes('district')
  ) {
    return true;
  }

  return (
    label.includes('school') ||
    label.includes('rcs') ||
    label === 'rcs school'
  );
}

export function isSubscriptionOrFeedSource(sourceCalendarName: string): boolean {
  const name = safeLower(safeTrim(sourceCalendarName));
  return (
    name.includes('holiday') ||
    name.includes('birthdays') ||
    name.includes('weather') ||
    name.includes('vacation club') ||
    name.includes('contacts') ||
    name.includes('phases of the moon')
  );
}
