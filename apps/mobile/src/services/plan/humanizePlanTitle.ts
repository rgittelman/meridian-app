import type { LifeObject } from '@/types/capture';
import {
  KNOWN_PEOPLE_DISPLAY,
  isKnownPersonName,
} from '@/services/people/knownPeople';
import { truncateAtNaturalBoundary } from '@/utils/text/truncateForDisplay';
import { safeLower, safeTrim } from '@/utils/safeString';

const PLAN_TITLE_MAX = 50;

const LEADING_PHRASES = [
  /^remind me to\s+/i,
  /^remind me\s+/i,
  /^remember to\s+/i,
  /^remember\s+/i,
  /^don'?t forget to\s+/i,
  /^don'?t forget\s+/i,
  /^make sure to\s+/i,
  /^make sure\s+/i,
  /^need to remember\s+/i,
  /^need to\s+/i,
  /^i need to\s+/i,
  /^i have to\s+/i,
  /^i should\s+/i,
  /^have to\s+/i,
  /^must\s+/i,
  /^gotta\s+/i,
  /^trying to\s+/i,
  /^want to\s+/i,
  /^should\s+/i,
];

const TIMING_TAIL_PATTERNS = [
  // "next Thursday ..." — relative weekday with optional trailing context
  /\s+next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b[^.]*$/i,

  // "tomorrow around 1pm", "today about 3pm"
  /\s+(?:today|tomorrow|tonight)\s+(?:around|about)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*$/i,

  // "tomorrow at 6:15am", "today at 11:30"
  /\s+(?:today|tomorrow|tonight)\s+at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*$/i,

  // "tomorrow morning", "tonight evening"
  /\s+(?:today|tomorrow|tonight)\s+(?:morning|afternoon|evening)\s*$/i,

  // "Saturday at 9am", "Tuesday at 6pm" — DayName + "at" + time
  /\s+(?:on\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*$/i,

  // F1 — "Saturday 9am", "Tuesday 6pm", "Wednesday 8:30am"
  // DayName directly followed by time+meridiem, no "at" connector required.
  // Runs before bare-DayName so the clock is stripped as a unit with the day name.
  /\s+(?:on\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)\s*$/i,

  // F2 — "before Friday", "before Monday", "before the board"
  // Moved BEFORE bare-DayName: previously the bare-DayName pattern fired first,
  // stripping only "Friday" and leaving "before" dangling.
  /\s+before\s+(?:the\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|board|meeting)\b[^.]*$/i,

  // Bare DayName at end — "Tuesday", "on Saturday"
  /\s+(?:on\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s*$/i,

  // "at 6pm", "at 11:30am" — standalone time at end
  /\s+at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)\s*$/i,

  // "today", "tomorrow", "tonight" at end
  /\s+(?:today|tomorrow|tonight)\s*$/i,
];

const LOCATION_TAIL_PATTERN =
  /\s+in\s+(?:the\s+)?[a-z][a-z0-9\s.'-]{2,56}?(?=\s+at\s+\d{1,2}|\s*$)/i;

const MINOR_WORDS = new Set([
  'to', 'at', 'for', 'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'by',
]);

const KNOWN_BY_LOWER = new Map(
  KNOWN_PEOPLE_DISPLAY.map((n) => [n.toLowerCase(), n]),
);

function stripLeadingPhrases(text: string): string {
  let result = safeTrim(text);
  for (const pattern of LEADING_PHRASES) {
    const stripped = result.replace(pattern, '');
    if (stripped !== result && stripped.length > 2) {
      result = stripped;
      break;
    }
  }
  return safeTrim(result);
}

function stripLocationTail(text: string): string {
  return safeTrim(text.replace(LOCATION_TAIL_PATTERN, ''));
}

function stripTimingTail(text: string): string {
  let result = safeTrim(text);
  let changed = true;
  while (changed) {
    changed = false;
    for (const pattern of TIMING_TAIL_PATTERNS) {
      const stripped = result.replace(pattern, '');
      if (stripped !== result && stripped.length > 2) {
        result = safeTrim(stripped);
        changed = true;
        break;
      }
    }
  }
  return result;
}

function displayNameForToken(token: string): string | null {
  const bare = token.replace(/[''´`]/g, "'");
  const lower = safeLower(bare.replace(/'s$/, ''));
  if (KNOWN_BY_LOWER.has(lower)) {
    const base = KNOWN_BY_LOWER.get(lower)!;
    return /'s$/i.test(bare) ? `${base}'s` : base;
  }
  if (isKnownPersonName(bare)) {
    return KNOWN_PEOPLE_DISPLAY.find((n) => n.toLowerCase() === lower) ?? bare;
  }
  return null;
}

function titleCaseWord(word: string, index: number): string {
  const person = displayNameForToken(word);
  if (person) return person;

  const lower = word.toLowerCase();
  if (index > 0 && MINOR_WORDS.has(lower)) return lower;

  if (lower.length <= 2) return lower;

  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function titleCasePlanPhrase(text: string): string {
  const tokens = text.split(/\s+/).filter(Boolean);
  return tokens.map((word, i) => titleCaseWord(word, i)).join(' ');
}

function stillSoundsLikeDictation(text: string): boolean {
  return /^(remind|remember|don'?t forget|make sure|need to|i need|i should)\b/i.test(
    text,
  );
}

/**
 * Converts capture text into calm planning language for the Plan timeline.
 * Original raw text stays on the LifeObject — only display title changes.
 */
export function humanizePlanTitle(item: LifeObject): string {
  const raw = safeTrim(item.raw);
  if (!raw) return safeTrim(item.title, 'Capture');

  let core = stripLeadingPhrases(raw);
  core = stripLocationTail(core);
  core = stripTimingTail(core);
  core = safeTrim(core.replace(/^[,.\s]+/, ''));

  if (core.length < 3) {
    core = stripLeadingPhrases(raw);
  }

  if (stillSoundsLikeDictation(core)) {
    core = stripLeadingPhrases(raw);
    return truncateAtNaturalBoundary(
      core.charAt(0).toUpperCase() + core.slice(1),
      PLAN_TITLE_MAX,
    );
  }

  const humanized = titleCasePlanPhrase(core);
  if (humanized.length < 3) {
    const fallback = stripLeadingPhrases(raw);
    return truncateAtNaturalBoundary(
      fallback.charAt(0).toUpperCase() + fallback.slice(1),
      PLAN_TITLE_MAX,
    );
  }

  return truncateAtNaturalBoundary(humanized, PLAN_TITLE_MAX);
}

/** Household names for subtle Plan context — stable display order. */
export function formatPlanPeopleLine(people: string[]): string | null {
  if (people.length === 0) return null;

  const order = new Map(KNOWN_PEOPLE_DISPLAY.map((n, i) => [n.toLowerCase(), i]));
  const unique = new Map<string, string>();

  for (const name of people) {
    if (!isKnownPersonName(name)) continue;
    const display =
      KNOWN_PEOPLE_DISPLAY.find((n) => n.toLowerCase() === name.toLowerCase()) ?? name;
    unique.set(display.toLowerCase(), display);
  }

  const sorted = [...unique.values()].sort(
    (a, b) => (order.get(a.toLowerCase()) ?? 99) - (order.get(b.toLowerCase()) ?? 99),
  );

  if (sorted.length === 0) return null;
  return sorted.join(' · ');
}
