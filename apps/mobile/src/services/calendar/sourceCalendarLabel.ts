import { safeLower, safeTrim } from '@/utils/safeString';

/**
 * Human display label for a calendar source — never raw emails in UI.
 * Stored as displaySourceLabel on events; generated once at normalize.
 */
export function formatSourceCalendarDisplayLabel(
  sourceCalendarName: string | null | undefined,
): string {
  const raw = safeTrim(sourceCalendarName, 'Calendar');
  const lower = safeLower(raw);

  if (raw.includes('@')) {
    const domain = raw.split('@')[1] ?? '';
    const local = raw.split('@')[0] ?? '';
    if (lower.includes('rcs') || domain.includes('rcscherryhill')) {
      return 'RCS School';
    }
    if (domain.includes('bfsc')) return 'BFSC';
    if (local.includes('noreply') || local.includes('calendar')) {
      return 'Calendar Feed';
    }
    const domainLabel = domain.split('.')[0];
    if (domainLabel && domainLabel.length <= 20) {
      return domainLabel.charAt(0).toUpperCase() + domainLabel.slice(1);
    }
  }

  if (lower.includes('rcs') || lower.includes('cherry hill') || lower.includes('cherryhill')) {
    return 'RCS School';
  }
  if (lower.includes('teamsnap') || lower.includes('team snap')) return 'TeamSnap';
  if (lower.includes('family')) return 'Family Calendar';
  if (lower.includes('bfsc')) return 'BFSC';
  if (lower.includes('community')) return 'Community';
  if (
    lower.includes('school') ||
    lower.includes('classroom') ||
    lower.includes('pta')
  ) {
    return 'RCS School';
  }
  if (lower.includes('work') || lower.includes('office') || lower.includes('professional')) {
    if (lower.includes('ryan')) return 'Ryan Work';
    return 'Work';
  }
  if (lower.includes('ryan') && lower.includes('gittelman')) return 'Ryan';
  if (lower.includes('crystal')) return 'Crystal';
  if (lower.includes('hudson')) return 'Hudson';
  if (lower.includes('grace')) return 'Grace';

  if (raw.length <= 28) return raw;
  return raw.slice(0, 26).trim() + '…';
}

/** Alias for attribution + relevance layers. */
export const formatDisplaySourceLabel = formatSourceCalendarDisplayLabel;
