import { KNOWN_PEOPLE_DISPLAY } from '@/services/people/knownPeople';
import { isDevEnvironment } from '@/utils/isDev';
import { isExcludedBrandName } from './brandExclusions';

const ALLOWED_PEOPLE = new Set(
  KNOWN_PEOPLE_DISPLAY.map((n) => n.toLowerCase()),
);

/** Words that must never render as UI pills (may still affect parsing). */
const DISALLOWED_PILL_WORDS = new Set([
  'lifeguard',
  'training',
  'practice',
  'pickup',
  'dropoff',
  'hockey',
  'soccer',
  'school',
  'meeting',
  'budget',
  'payment',
  'scheduling',
  'teamsnap',
  'rcs',
  'bfsc',
  'game',
  'class',
  'lesson',
  'dentist',
  'doctor',
  'work',
  'financial',
  'family',
  'personal',
  'health',
  'household',
]);

const ALLOWED_TIMING_EXACT = new Set([
  'today',
  'tomorrow',
  'tonight',
  'this morning',
  'this afternoon',
  'this evening',
  'this weekend',
  'next week',
]);

const TIMING_TIME_PATTERN =
  /^(today|tomorrow|tonight)\s+(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)?$/i;

const TIMING_AROUND_PATTERN =
  /^(today|tomorrow)\s+around\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?$/i;

const CLOCK_ONLY_PATTERN =
  /^(?:at|by|around|about)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)$/i;

export function isAllowedPersonPill(name: string): boolean {
  if (isExcludedBrandName(name)) return false;
  const key = name.toLowerCase().replace(/[^a-z]/g, '');
  if (DISALLOWED_PILL_WORDS.has(key)) return false;
  return ALLOWED_PEOPLE.has(name.toLowerCase());
}

export function isAllowedTimingPill(label: string): boolean {
  const normalized = label.trim().toLowerCase();
  if (!normalized) return false;

  if (ALLOWED_TIMING_EXACT.has(normalized)) return true;
  if (TIMING_TIME_PATTERN.test(normalized)) return true;
  if (TIMING_AROUND_PATTERN.test(normalized)) return true;
  if (CLOCK_ONLY_PATTERN.test(normalized)) return true;

  for (const word of DISALLOWED_PILL_WORDS) {
    if (normalized === word) return false;
  }

  return false;
}

export function formatTimingPillLabel(label: string): string {
  const lower = label.trim().toLowerCase();
  if (ALLOWED_TIMING_EXACT.has(lower)) {
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }
  return label.trim();
}

export function logPillDecision(
  kind: 'person' | 'timing' | 'skipped',
  value: string,
  reason: string,
): void {
  if (!isDevEnvironment()) return;
  console.log(`[Meridian:pill] ${kind} "${value}" — ${reason}`);
}
