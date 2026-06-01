import type { Confidence } from '@/types/capture';
import { safeLower, safeTrim } from '@/utils/safeString';

/** Meridian-known people for calendar inference (test profile). */
export const KNOWN_PEOPLE_DISPLAY = [
  'Ryan',
  'Crystal',
  'Grace',
  'Reagan',
  'Quinn',
  'Hudson',
] as const;

const KNOWN_KEYS = new Set(
  KNOWN_PEOPLE_DISPLAY.map((n) => n.toLowerCase()),
);

const ALIASES: Record<string, string> = {
  mom: 'Crystal',
  mother: 'Crystal',
  dad: 'Ryan',
  father: 'Ryan',
};

export type KnownPersonMatch = {
  name: string;
  confidence: Confidence;
  source: string;
};

export function isKnownPersonName(name: string | null | undefined): boolean {
  const key = safeLower(name);
  return KNOWN_KEYS.has(key) || Boolean(ALIASES[key]);
}

function displayNameForKey(key: string): string {
  if (ALIASES[key]) return ALIASES[key];
  const found = KNOWN_PEOPLE_DISPLAY.find((n) => n.toLowerCase() === key);
  return found ?? key.charAt(0).toUpperCase() + key.slice(1);
}

/**
 * Matches only configured people — never arbitrary title-case tokens.
 */
export function matchKnownPeopleInText(text: string | null | undefined): KnownPersonMatch[] {
  const safe = safeTrim(text);
  if (!safe) return [];

  const found = new Map<string, KnownPersonMatch>();

  const add = (name: string, confidence: Confidence, source: string) => {
    const key = safeLower(name);
    if (!KNOWN_KEYS.has(key) && !ALIASES[key]) return;
    const display = displayNameForKey(key);
    const existing = found.get(display.toLowerCase());
    if (
      !existing ||
      confidence === 'high' ||
      (confidence === 'medium' && existing.confidence === 'low')
    ) {
      found.set(display.toLowerCase(), { name: display, confidence, source });
    }
  };

  for (const person of KNOWN_PEOPLE_DISPLAY) {
    const re = new RegExp(`\\b${person}\\b`, 'i');
    if (re.test(safe)) {
      add(person, 'high', person);
    }
  }

  for (const [alias, person] of Object.entries(ALIASES)) {
    const re = new RegExp(`\\b${alias}\\b`, 'i');
    if (re.test(safe)) {
      add(person, 'medium', alias);
    }
  }

  const social = safe.match(
    /\b(?:dinner|lunch|breakfast|coffee|drinks)\s+with\s+(Ryan|Crystal|Grace|Reagan|Quinn|Hudson)\b/i,
  );
  if (social?.[1]) {
    add(social[1], 'high', social[0]);
  }

  for (const person of KNOWN_PEOPLE_DISPLAY) {
    const activity = new RegExp(
      `\\b${person}\\s+(?:pickup|pick\\s*up|drop\\s*off|soccer|hockey|swim|practice|game|dentist|doctor|cheer|meeting|appointment)\\b`,
      'i',
    );
    if (activity.test(safe)) {
      add(person, 'high', activity.source);
    }
  }

  const pickup = safe.match(
    /\b(?:pick\s*up|pickup|drop\s*off|dropoff|remind)\s+(Ryan|Crystal|Grace|Reagan|Quinn|Hudson)\b/i,
  );
  if (pickup?.[1]) {
    add(pickup[1], 'high', pickup[0]);
  }

  return Array.from(found.values());
}
