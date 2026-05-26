/**
 * lib/chat-actions/extract.ts — Single canonical action extraction from chat.
 *
 * Classifies each user message as task / reminder / event / none.
 * Produces a structured result with clean title, parsed time, and confidence.
 * Quality thresholds prevent fragment titles from persisting.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChatAction {
  type:          "task" | "reminder" | "event";
  title:         string;
  date:          string | null;
  time:          string | null;
  scheduled_for: string | null;
  description:   string | null;
  confidence:    number;
  source_text:   string;
}

// ── Time / date parsing ───────────────────────────────────────────────────────

const DAY_MAP: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

const SPECIFIC_TIME_RE = /\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i;
const BARE_TIME_RE     = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i;
const IN_DURATION_RE   = /\bin\s+(\d+)\s*(hour|hr|minute|min)s?\b/i;
const DAY_NAME_RE      = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;
const TOMORROW_RE      = /\btomorrow\b/i;
const TODAY_RE         = /\btoday\b/i;
const TONIGHT_RE       = /\btonight\b/i;
const THIS_MORNING_RE  = /\bthis\s+morning\b/i;
const THIS_AFTERNOON_RE= /\bthis\s+afternoon\b/i;
const THIS_EVENING_RE  = /\bthis\s+evening\b/i;

interface ParsedSchedule {
  scheduled_for: string;
  date: string;
  time: string | null;
}

function fmtDate(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function fmtTime(h: number, m: number): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function nextWeekday(dayName: string): Date {
  const target = DAY_MAP[dayName.toLowerCase()];
  if (target === undefined) return new Date();
  const d = new Date();
  const diff = (target - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d;
}

function parseSchedule(text: string): ParsedSchedule | null {
  const now = new Date();
  const target = new Date(now);
  let hasDate = false;
  let hours: number | null = null;
  let minutes = 0;

  // "in 2 hours"
  const durMatch = text.match(IN_DURATION_RE);
  if (durMatch) {
    const amount = parseInt(durMatch[1], 10);
    const unit = durMatch[2].toLowerCase();
    if (unit.startsWith("hour") || unit.startsWith("hr")) {
      target.setTime(now.getTime() + amount * 3600_000);
    } else {
      target.setTime(now.getTime() + amount * 60_000);
    }
    return {
      scheduled_for: target.toISOString(),
      date: fmtDate(target),
      time: fmtTime(target.getHours(), target.getMinutes()),
    };
  }

  // Date context
  if (TOMORROW_RE.test(text)) {
    target.setDate(target.getDate() + 1);
    hasDate = true;
  } else if (DAY_NAME_RE.test(text)) {
    const dayMatch = text.match(DAY_NAME_RE)!;
    const nd = nextWeekday(dayMatch[1]);
    target.setFullYear(nd.getFullYear(), nd.getMonth(), nd.getDate());
    hasDate = true;
  } else if (TODAY_RE.test(text) || TONIGHT_RE.test(text) || THIS_MORNING_RE.test(text) || THIS_AFTERNOON_RE.test(text) || THIS_EVENING_RE.test(text)) {
    hasDate = true;
  }

  // Time context
  const specificTime = text.match(SPECIFIC_TIME_RE) || text.match(BARE_TIME_RE);
  if (specificTime) {
    hours = parseInt(specificTime[1], 10);
    minutes = specificTime[2] ? parseInt(specificTime[2], 10) : 0;
    const ampm = specificTime[3].toLowerCase();
    if (ampm === "pm" && hours !== 12) hours += 12;
    if (ampm === "am" && hours === 12) hours = 0;
    hasDate = true;
  } else if (TONIGHT_RE.test(text) || THIS_EVENING_RE.test(text)) {
    hours = 20; minutes = 0;
  } else if (THIS_MORNING_RE.test(text)) {
    hours = 9; minutes = 0;
  } else if (THIS_AFTERNOON_RE.test(text)) {
    hours = 13; minutes = 0;
  }

  if (!hasDate) return null;

  if (hours !== null) {
    target.setHours(hours, minutes, 0, 0);
  }

  return {
    scheduled_for: target.toISOString(),
    date: fmtDate(target),
    time: hours !== null ? fmtTime(hours, minutes) : null,
  };
}

// ── Title cleaning ────────────────────────────────────────────────────────────

const TIME_STRIP_PATTERNS = [
  IN_DURATION_RE,
  SPECIFIC_TIME_RE,
  BARE_TIME_RE,
  /\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i,
  /\b(today|tomorrow|tonight)\b/gi,
  /\bthis\s+(morning|afternoon|evening)\b/gi,
  /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
  /\b(in\s+\d+\s*(?:hours?|hrs?|minutes?|mins?))\b/gi,
];

const LEADING_JUNK_RE = /^(?:to|for|about|that|me|the|my|a|an)\s+/i;

function cleanActionTitle(raw: string): string {
  let t = raw.trim();

  for (const re of TIME_STRIP_PATTERNS) {
    t = t.replace(re, " ");
  }

  t = t.replace(/\s{2,}/g, " ").trim();
  t = t.replace(/[.,!?;:]+$/, "").trim();

  // Strip leading prepositions/articles repeatedly
  for (let i = 0; i < 4; i++) {
    const before = t;
    t = t.replace(LEADING_JUNK_RE, "").trim();
    if (t === before) break;
  }

  if (!t) return "";

  t = t.charAt(0).toUpperCase() + t.slice(1);

  // Only capitalize words that are very likely proper nouns.
  // Keep all common English words lowercase. Only capitalize short
  // words (2-3 chars) that look like names when surrounded by context.
  // This is intentionally conservative — better to under-capitalize
  // than to produce "Call My Daughter" style titles.

  return t.slice(0, 120);
}

// ── Quality validation ────────────────────────────────────────────────────────

const NOISE_WORDS = new Set([
  "a", "an", "the", "my", "me", "i", "to", "for", "of", "and", "or",
  "at", "in", "on", "it", "is", "that", "this", "with", "about",
]);

function titleQuality(title: string): number {
  if (!title) return 0;
  const words = title.toLowerCase().split(/\s+/).filter(Boolean);
  const meaningful = words.filter((w) => !NOISE_WORDS.has(w) && w.length > 1);

  if (meaningful.length === 0) return 0;
  if (meaningful.length === 1 && meaningful[0].length < 4) return 0.3;
  if (meaningful.length === 1) return 0.55;
  if (meaningful.length >= 2) return 0.85;
  return 0.5;
}

const MIN_QUALITY = 0.5;

// ── Intent detection patterns ─────────────────────────────────────────────────

interface IntentMatch {
  type: "reminder" | "task" | "event";
  rawBody: string;
  fullMatch: string;
}

const INTENT_PATTERNS: { type: "reminder" | "task" | "event"; re: RegExp; bodyIdx: number }[] = [
  // Reminder patterns (ordered by specificity)
  { type: "reminder", re: /\b(?:remind me in)\s+\d+\s*(?:hours?|hrs?|minutes?|mins?)\s+to\s+(.+)/i, bodyIdx: 1 },
  { type: "reminder", re: /\b(?:can you |could you |please )?(?:set a reminder|create a reminder)\s+(?:to|for|about)\s+(.+)/i, bodyIdx: 1 },
  { type: "reminder", re: /\b(?:can you |could you |please )?(?:remind me to|remind me about)\s+(.+)/i, bodyIdx: 1 },
  { type: "reminder", re: /\b(?:don'?t let me forget to|don'?t forget to)\s+(.+)/i, bodyIdx: 1 },
  { type: "reminder", re: /\b(?:set a reminder|create a reminder)\s+(.+)/i, bodyIdx: 1 },
  { type: "reminder", re: /\breminder\s+(?:to|for)\s+(.+)/i, bodyIdx: 1 },

  // Task patterns
  { type: "task", re: /\b(?:i need to|i have to|i must)\s+(.+?)(?:\.|$)/i, bodyIdx: 1 },
  { type: "task", re: /\b(?:i'll|i will)\s+(.+?)(?:\.|$)/i, bodyIdx: 1 },
  { type: "task", re: /\b(?:need to|have to)\s+(.+?)(?:\.|$)/i, bodyIdx: 1 },
];

function detectIntent(text: string): IntentMatch | null {
  for (const { type, re, bodyIdx } of INTENT_PATTERNS) {
    const match = text.match(re);
    if (!match?.[bodyIdx]) continue;
    return {
      type,
      rawBody: match[bodyIdx].trim(),
      fullMatch: match[0],
    };
  }
  return null;
}

// ── Normalization for dedup ───────────────────────────────────────────────────

export function normalizeForDedup(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Main extraction ───────────────────────────────────────────────────────────

/**
 * Extract a single structured action from the most recent user message.
 * Only processes the LAST user message to avoid re-extracting from history.
 */
export function extractChatAction(
  messages: { role: string; content: string }[],
): ChatAction | null {
  // Only look at the most recent user message
  const userMessages = messages.filter((m) => m.role === "user");
  if (userMessages.length === 0) return null;
  const text = userMessages[userMessages.length - 1].content;

  if (text.length < 5) return null;

  const intent = detectIntent(text);
  if (!intent) return null;

  const title = cleanActionTitle(intent.rawBody);
  const quality = titleQuality(title);

  console.log("[chat-actions] extracted:", {
    type: intent.type,
    rawBody: intent.rawBody.slice(0, 60),
    cleanTitle: title,
    quality,
    source: text.slice(0, 80),
  });

  if (quality < MIN_QUALITY) {
    console.log("[chat-actions] rejected: quality too low", { title, quality });
    return null;
  }

  const schedule = parseSchedule(text);

  const action: ChatAction = {
    type:          intent.type,
    title,
    date:          schedule?.date ?? null,
    time:          schedule?.time ?? null,
    scheduled_for: schedule?.scheduled_for ?? null,
    description:   text.length > title.length + 10 ? text : null,
    confidence:    quality * (schedule ? 1.0 : 0.85),
    source_text:   text,
  };

  console.log("[chat-actions] result:", {
    type: action.type,
    title: action.title,
    date: action.date,
    time: action.time,
    scheduled_for: action.scheduled_for,
    confidence: action.confidence,
  });

  return action;
}
