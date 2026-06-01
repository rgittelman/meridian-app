import { truncateAtNaturalBoundary } from '@/utils/text/truncateForDisplay';

/**
 * Derives a clean, display-ready title from raw capture input.
 *
 * Strips common filler phrases the user types to "remember" something,
 * leaving the core intent as the title. Capitalization is normalized.
 *
 * Examples:
 *   "Need to remember Grace pickup tomorrow at 5" → "Grace pickup tomorrow at 5"
 *   "don't forget to pay swim registration"       → "Pay swim registration"
 *   "i should review rug sales budget"            → "Review rug sales budget"
 */

const FILLER_PREFIXES = [
  /^need to remember\s+/i,
  /^remember to\s+/i,
  /^don'?t forget to\s+/i,
  /^don'?t forget\s+/i,
  /^make sure to\s+/i,
  /^make sure\s+/i,
  /^i need to\s+/i,
  /^i have to\s+/i,
  /^i should\s+/i,
  /^need to\s+/i,
  /^have to\s+/i,
  /^must\s+/i,
  /^gotta\s+/i,
  /^trying to\s+/i,
  /^want to\s+/i,
  /^should\s+/i,
];

export function deriveTitle(raw: string): string {
  let title = raw.trim();

  for (const prefix of FILLER_PREFIXES) {
    const stripped = title.replace(prefix, '');
    if (stripped !== title && stripped.length > 2) {
      title = stripped;
      break; // only strip one prefix
    }
  }

  const capitalized = title.charAt(0).toUpperCase() + title.slice(1);
  return truncateAtNaturalBoundary(capitalized, 88);
}
