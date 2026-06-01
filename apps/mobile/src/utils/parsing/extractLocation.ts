import type { ParsedField } from '@/types/capture';
import { safeTrim } from '@/utils/safeString';

const STATE_ABBREVS = new Set([
  'ny', 'nj', 'ct', 'ma', 'pa', 'ca', 'tx', 'fl', 'il', 'wa', 'dc',
]);

/**
 * Location phrases: "in Long Island City ny at 10am", "in NYC", "in the office".
 * Stops before clock, end of string, or trailing scheduling words.
 */
const IN_LOCATION_PATTERN =
  /\bin\s+(?:the\s+)?([a-z][a-z0-9\s.'-]{2,56}?)(?=\s+at\s+\d{1,2}|\s*$|[.,]|\s+on\s+(?:mon|tue|wed|thu|fri|sat|sun))/i;

/** "Store visit at Cherry Hill Wednesday" — venue before weekday, not a clock. */
const AT_VENUE_BEFORE_DAY_PATTERN =
  /\bat\s+([A-Za-z][A-Za-z\s.'-]{2,40}?)(?=\s+(?:next\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b)/i;

function titleCaseLocation(text: string): string {
  const words = safeTrim(text).split(/\s+/).filter(Boolean);
  return words
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (STATE_ABBREVS.has(lower) && index === words.length - 1) {
        return lower.toUpperCase();
      }
      if (lower.length <= 2 && index > 0) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

export function extractLocation(text: string): ParsedField<string> | null {
  const inMatch = text.match(IN_LOCATION_PATTERN);
  if (inMatch) {
    const raw = safeTrim(inMatch[1]);
    if (raw.length >= 3) {
      const value = titleCaseLocation(raw);
      return {
        value,
        confidence: value.split(/\s+/).length >= 2 ? 'high' : 'medium',
        source: inMatch[0].trim(),
      };
    }
  }

  const atMatch = text.match(AT_VENUE_BEFORE_DAY_PATTERN);
  if (!atMatch) return null;

  const raw = safeTrim(atMatch[1]);
  if (raw.length < 3 || /^\d/.test(raw)) return null;

  const value = titleCaseLocation(raw);
  return {
    value,
    confidence: value.split(/\s+/).length >= 2 ? 'high' : 'medium',
    source: atMatch[0].trim(),
  };
}
