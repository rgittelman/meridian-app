import type { ParsedField } from '@/types/capture';
import { isExcludedBrandName, logBrandExclusionMatch } from './brandExclusions';

const PLACE_PHRASE_EXCLUSIONS = [
  'cherry hill',
  'long island city',
  'long island',
];

// Words that look like names but aren't — days, months, directions, verbs
const NON_PERSON_WORDS = new Set([
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
  'January', 'February', 'March', 'April', 'June', 'July', 'August',
  'September', 'October', 'November', 'December',
  'Today', 'Tomorrow', 'Tonight', 'Morning', 'Afternoon', 'Evening',
  'Next', 'This', 'Last', 'That', 'Some', 'Every', 'Each',
  'Need', 'Want', 'Have', 'Get', 'Call', 'Text', 'Email', 'Ask',
  'Check', 'Make', 'Buy', 'Pick', 'Drop', 'Send', 'Pay', 'Book',
  'Meridian', 'Amazon', 'Google', 'Apple',
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

// Preposition + proper noun — "for Grace", "with Sarah", "pick up Grace"
const PREPOSITION_PATTERN =
  /\b(?:for|with|from|ask|call|text|email|tell|remind|about)\s+([A-Z][a-z]{2,20})\b/g;

// Direct object context — "pick up Grace", "drop off Emma", "remind Jake"
const PICKUP_PATTERN =
  /\b(?:pick\s+up|pickup|drop\s+off|dropoff|remind|bring)\s+([A-Z][a-z]{2,20})\b/gi;

// Name followed by activity context — "Grace pickup", "Emma practice", "Jake game"
const NAME_ACTIVITY_PATTERN =
  /\b([A-Z][a-z]{2,20})\s+(?:pickup|practice|game|class|appointment|meeting|birthday|recital|lesson|lifeguard|training|hockey|soccer|cheer|skates)\b/gi;

/**
 * Extract person references from natural language text.
 * Returns fields with appropriate confidence — humble about title-case words.
 */
export function extractPeople(text: string): ParsedField<string>[] {
  const found = new Map<string, ParsedField<string>>();

  const add = (value: string, confidence: ParsedField<string>['confidence'], source: string) => {
    if (isExcludedBrandName(value)) {
      logBrandExclusionMatch(value, 'people');
      return;
    }
    const lowerBlob = text.toLowerCase();
    if (PLACE_PHRASE_EXCLUSIONS.some((place) => lowerBlob.includes(place))) {
      const placeWords = PLACE_PHRASE_EXCLUSIONS.find((p) => lowerBlob.includes(p))!.split(
        /\s+/,
      );
      if (placeWords.some((w) => w === value.toLowerCase())) return;
    }
    const key = value.toLowerCase();
    const existing = found.get(key);
    if (!existing || confidence === 'high' || (confidence === 'medium' && existing.confidence === 'low')) {
      found.set(key, { value, confidence, source });
    }
  };

  // Family role words — high confidence
  const words = text.toLowerCase().split(/\s+/);
  for (const word of words) {
    const clean = word.replace(/[^a-z]/g, '');
    if (FAMILY_ROLES.has(clean)) {
      const display = clean.charAt(0).toUpperCase() + clean.slice(1);
      add(display, 'high', word);
    }
  }

  // Titled names — high confidence
  for (const m of text.matchAll(TITLE_PATTERN)) {
    add(m[2] ?? m[0], 'high', m[0]);
  }

  // Pickup / dropoff context — high confidence (child logistics)
  for (const m of text.matchAll(PICKUP_PATTERN)) {
    const name = m[1];
    if (name && !NON_PERSON_WORDS.has(name)) {
      add(name, 'high', m[0]);
    }
  }

  // Name + activity context — high confidence (e.g., "Grace practice")
  for (const m of text.matchAll(NAME_ACTIVITY_PATTERN)) {
    const name = m[1];
    if (name && !NON_PERSON_WORDS.has(name)) {
      add(name, 'high', m[0]);
    }
  }

  // Prepositional names — medium confidence
  for (const m of text.matchAll(PREPOSITION_PATTERN)) {
    const name = m[1];
    if (name && !NON_PERSON_WORDS.has(name)) {
      add(name, 'medium', m[0]);
    }
  }

  // Leading household child name — "Grace lifeguard training tomorrow"
  const leadChild = text.match(
    /^([A-Z][a-z]{2,20})\s+(?:lifeguard|training|practice|pickup|hockey|soccer|game|class|lesson)\b/i,
  );
  if (leadChild?.[1] && !NON_PERSON_WORDS.has(leadChild[1])) {
    add(leadChild[1], 'high', leadChild[0]);
  }

  // Title-case words NOT at sentence start and not in exclusion list — low confidence
  const tokenPattern = /(?:^|\s)([A-Z][a-z]{2,20})(?=\s|$|[,.])/g;
  let isFirst = true;
  for (const m of text.matchAll(tokenPattern)) {
    if (isFirst) { isFirst = false; continue; }
    const name = m[1];
    if (name && !NON_PERSON_WORDS.has(name) && !found.has(name.toLowerCase())) {
      add(name, 'low', name);
    }
  }

  return Array.from(found.values());
}
