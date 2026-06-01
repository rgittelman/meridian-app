import type { ParsedField } from '@/types/capture';

// Words that look like names but aren't
const NON_PERSON_WORDS = new Set([
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
  'January', 'February', 'March', 'April', 'June', 'July', 'August',
  'September', 'October', 'November', 'December',
  'Today', 'Tomorrow', 'Tonight', 'Morning', 'Afternoon', 'Evening',
  'Next', 'This', 'Last', 'That', 'Some', 'Every', 'Each',
  'Need', 'Want', 'Have', 'Get', 'Call', 'Text', 'Email', 'Ask',
  'Check', 'Make', 'Buy', 'Pick', 'Drop', 'Send', 'Pay', 'Book',
  'Meridian', 'Grace',  // <- will be re-added by family detection
]);

// High-confidence family role words
const FAMILY_ROLES = new Set([
  'mom', 'dad', 'mother', 'father', 'sister', 'brother',
  'grandma', 'grandpa', 'grandmother', 'grandfather',
  'wife', 'husband', 'partner', 'spouse',
  'son', 'daughter', 'baby', 'kids', 'child',
  'aunt', 'uncle', 'cousin',
]);

// Title prefixes → high confidence name follows
const TITLE_PATTERN = /\b(Dr|Mr|Mrs|Ms|Prof|Coach|Pastor|Rabbi|Father)\.?\s+([A-Z][a-z]{1,20})/g;

// Preposition + proper noun signals ("for Grace", "with Sarah", "from Mom")
const PREPOSITION_PATTERN = /\b(?:for|with|from|ask|call|text|email|tell|remind)\s+([A-Z][a-z]{2,20})\b/g;

/**
 * Extract person references from natural language text.
 * Returns fields with appropriate confidence — humble about title-case words.
 */
export function extractPeople(text: string): ParsedField<string>[] {
  const found = new Map<string, ParsedField<string>>();

  const add = (value: string, confidence: ParsedField<string>['confidence'], source: string) => {
    const key = value.toLowerCase();
    if (!found.has(key) || confidence === 'high') {
      found.set(key, { value, confidence, source });
    }
  };

  // Family role words — high confidence
  const words = text.toLowerCase().split(/\s+/);
  for (const word of words) {
    const clean = word.replace(/[^a-z]/g, '');
    if (FAMILY_ROLES.has(clean)) {
      // Capitalize first letter for display
      const display = clean.charAt(0).toUpperCase() + clean.slice(1);
      add(display, 'high', word);
    }
  }

  // Titled names — high confidence
  const titleMatches = text.matchAll(TITLE_PATTERN);
  for (const m of titleMatches) {
    add(m[0], 'high', m[0]);
  }

  // Prepositional names — medium confidence
  const prepMatches = text.matchAll(PREPOSITION_PATTERN);
  for (const m of prepMatches) {
    const name = m[1];
    if (!NON_PERSON_WORDS.has(name)) {
      add(name, 'medium', m[0]);
    }
  }

  // Title-case words NOT at sentence start and not in exclusion list — low confidence
  const tokenPattern = /(?<!\.\s)(?<!\?\s)(?<!\!\s)(?:^|\s)([A-Z][a-z]{2,20})(?=\s|$|[,.])/g;
  const tokenMatches = text.matchAll(tokenPattern);
  let isFirst = true;
  for (const m of tokenMatches) {
    if (isFirst) { isFirst = false; continue; } // skip sentence-start word
    const name = m[1];
    if (!NON_PERSON_WORDS.has(name) && !found.has(name.toLowerCase())) {
      add(name, 'low', name);
    }
  }

  return Array.from(found.values());
}
