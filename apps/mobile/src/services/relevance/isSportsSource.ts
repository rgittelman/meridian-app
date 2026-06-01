import { safeLower, safeTrim } from '@/utils/safeString';

export function isTeamSnapOrSportsCalendar(
  sourceCalendarName: string,
  displayLabel?: string,
): boolean {
  const name = safeLower(sourceCalendarName);
  const label = safeLower(displayLabel ?? '');

  return (
    name.includes('teamsnap') ||
    label.includes('teamsnap') ||
    name.includes('team snap') ||
    (name.includes('hockey') && !name.includes('school')) ||
    name.includes('sports') ||
    name.includes('league') ||
    name.includes('rink') ||
    label.includes('hockey') ||
    label === 'teamsnap'
  );
}

/** Raw league schedule titles that need humanization, not suppression. */
export function isGenericLeagueScheduleTitle(title: string): boolean {
  const lower = safeLower(safeTrim(title));
  if (!lower) return false;

  if (/\bdivision\b/i.test(lower)) return true;
  if (/rangers\s*\/\s*\w+/i.test(lower)) return true;
  if (/rangers\s+vs\s+/i.test(lower)) return true;
  if (/^[\w\s]+\/[\w\s]+$/i.test(lower) && lower.length < 40) return true;
  if (
    /\b(beaver|penguin)\b/i.test(lower) &&
    /rangers|division|hockey|teamsnap|@|\bvs\b|practice|game/i.test(lower)
  ) {
    return true;
  }
  if (/teamsnap/i.test(lower) && /rangers|beaver|penguin|division/i.test(lower)) {
    return true;
  }

  return false;
}

export function detectSportsActivityType(
  title: string,
  location?: string,
  sourceName?: string,
): string | null {
  const text = [title, location ?? '', sourceName ?? ''].join(' ').toLowerCase();

  if (text.includes('hockey')) return 'hockey';
  if (text.includes('soccer')) return 'soccer';
  if (text.includes('volleyball')) return 'volleyball';
  if (text.includes('football')) return 'football';
  if (text.includes('cheer')) return 'cheer';
  if (text.includes('swim')) return 'swim';
  if (text.includes('lacrosse')) return 'lacrosse';
  if (text.includes('basketball')) return 'basketball';
  if (text.includes('baseball')) return 'baseball';
  if (/\b(game|practice|tournament)\b/.test(text)) return 'game';

  // Do not default unknown TeamSnap events to 'hockey' — return null when sport is unknown.
  return null;
}
