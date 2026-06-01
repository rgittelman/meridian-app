import type { CaptureConfirmationMessage, LifeObject } from '@/types/capture';
import { safeLower, safeTrim } from '@/utils/safeString';

function eventShortLabel(item: LifeObject): string {
  const title = safeTrim(item.linkedCalendarEventTitle, 'your event');
  if (title.length <= 42) return title;
  return title.slice(0, 40).trim() + '…';
}

/** e.g. "Hudson · Hockey Game" → "Hudson hockey" */
function friendlyEventPhrase(title: string): string | null {
  const t = safeTrim(title);
  const dot = t.indexOf('·');
  if (dot > 0) {
    const person = t.slice(0, dot).trim();
    const rest = safeLower(t.slice(dot + 1));
    if (rest.includes('hockey')) return `${person} hockey`;
    if (rest.includes('soccer')) return `${person} soccer`;
    if (rest.includes('volleyball')) return `${person} volleyball`;
    if (rest.includes('pickup') || rest.includes('pick up')) return `${person} pickup`;
    return `${person} ${rest.split(/\s+/)[0] ?? 'event'}`.trim();
  }
  if (/\bboard\b/i.test(t)) return 'your board meeting';
  return null;
}

/**
 * Calendar-linked confirmation — calm, specific, non-technical.
 */
export function generateCalendarLinkConfirmation(
  item: LifeObject,
): CaptureConfirmationMessage | null {
  if (!item.linkedCalendarEventId || !item.relationshipConfidence) return null;

  const label = eventShortLabel(item);

  const friendly = friendlyEventPhrase(label);

  if (item.relationshipConfidence === 'high') {
    if (item.relationshipType === 'bring_to_event') {
      return friendly ? `Added to ${friendly}.` : `Linked to ${label}.`;
    }
    if (item.relationshipType === 'prep_for_event') {
      return friendly
        ? `Added to ${friendly}.`
        : `Linked to your ${safeLower(label)}.`;
    }
    if (friendly) return `Linked to ${friendly}.`;
    return `Linked to ${label}.`;
  }

  if (item.relationshipConfidence === 'medium') {
    return `Looks related to ${label}.`;
  }

  return null;
}
