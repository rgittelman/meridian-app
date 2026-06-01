/**
 * lib/chat-actions/extract.ts — Chat Intent Router.
 *
 * Single canonical entry point for classifying user chat messages.
 * Determines intent (task / reminder / event / memory / question / none)
 * and produces a structured result with clean title, parsed time, and
 * confidence score. Quality thresholds prevent fragment titles from
 * persisting.
 *
 * This router is the ONLY place where chat messages are classified.
 * No other extractor should compete with it.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type ChatIntent =
  | "task"
  | "reminder"
  | "event"
  | "memory"
  | "question"
  | "none";

export interface ChatAction {
  intent:               ChatIntent;
  title:                string;
  body:                 string | null;
  date:                 string | null;
  time:                 string | null;
  scheduled_for:        string | null;
  domain:               string | null;
  confidence:           number;
  should_persist:       boolean;
  clarification_needed: boolean;
  reason:               string;
  source_text:          string;
}

/** @deprecated Use ChatAction.intent instead. Kept for persist.ts compat. */
export type ChatActionCompat = ChatAction & { type: ChatAction["intent"] };

// ── Time / date parsing ───────────────────────────────────────────────────────

const DAY_MAP: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

const SPECIFIC_TIME_RE  = /\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i;
const BARE_TIME_RE      = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i;
const MILITARY_TIME_RE  = /\b(\d{2}):(\d{2})\b/;
const IN_DURATION_RE    = /\bin\s+(\d+)\s*(hour|hr|minute|min)s?\b/i;
const AT_BARE_HOUR_RE   = /\bat\s+(\d{1,2})\b(?!\s*(?:am|pm|:\d))/i;
const DAY_NAME_RE       = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;
const TOMORROW_RE       = /\btomorrow\b/i;
const TODAY_RE          = /\btoday\b/i;
const TONIGHT_RE        = /\btonight\b/i;
const THIS_MORNING_RE   = /\b(?:this|in the)\s+morning\b/i;
const THIS_AFTERNOON_RE = /\b(?:this|in the)\s+afternoon\b/i;
const THIS_EVENING_RE   = /\b(?:this|in the)\s+evening\b/i;

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

/**
 * Parse time/date from text. Returns timezone-free date and time strings
 * so the display layer can show exactly what the user said, regardless
 * of the server's timezone.
 */
export function parseSchedule(text: string): ParsedSchedule | null {
  const now = new Date();
  let hasDate = false;
  let explicitToday = false;
  let hours: number | null = null;
  let minutes = 0;

  let targetYear  = now.getFullYear();
  let targetMonth = now.getMonth();
  let targetDay   = now.getDate();

  // "in 2 hours" — relative duration, must use actual clock
  const durMatch = text.match(IN_DURATION_RE);
  if (durMatch) {
    const amount = parseInt(durMatch[1], 10);
    const unit = durMatch[2].toLowerCase();
    const target = new Date(now);
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

  // ── Explicit time — ALWAYS wins ──────────────────────────────────────────

  const specificTime = text.match(SPECIFIC_TIME_RE) || text.match(BARE_TIME_RE);
  if (specificTime) {
    hours = parseInt(specificTime[1], 10);
    minutes = specificTime[2] ? parseInt(specificTime[2], 10) : 0;
    const ampm = specificTime[3].toLowerCase();
    if (ampm === "pm" && hours !== 12) hours += 12;
    if (ampm === "am" && hours === 12) hours = 0;
    hasDate = true;
  } else {
    const milMatch = text.match(MILITARY_TIME_RE);
    if (milMatch) {
      const h = parseInt(milMatch[1], 10);
      const m = parseInt(milMatch[2], 10);
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        hours = h;
        minutes = m;
        hasDate = true;
      }
    }
  }

  // "at 5" without am/pm — infer PM for hours 1-7, AM for 8-11
  if (hours === null) {
    const bareHourMatch = text.match(AT_BARE_HOUR_RE);
    if (bareHourMatch) {
      const h = parseInt(bareHourMatch[1], 10);
      if (h >= 1 && h <= 12) {
        hours = h <= 7 ? h + 12 : h;
        minutes = 0;
        hasDate = true;
      }
    }
  }

  // ── Date context ─────────────────────────────────────────────────────────

  if (TOMORROW_RE.test(text)) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    targetYear  = tomorrow.getFullYear();
    targetMonth = tomorrow.getMonth();
    targetDay   = tomorrow.getDate();
    hasDate = true;
  } else if (DAY_NAME_RE.test(text)) {
    const dayMatch = text.match(DAY_NAME_RE)!;
    const nd = nextWeekday(dayMatch[1]);
    targetYear  = nd.getFullYear();
    targetMonth = nd.getMonth();
    targetDay   = nd.getDate();
    hasDate = true;
  } else if (TODAY_RE.test(text) || TONIGHT_RE.test(text) || THIS_MORNING_RE.test(text) || THIS_AFTERNOON_RE.test(text) || THIS_EVENING_RE.test(text)) {
    hasDate = true;
    explicitToday = TODAY_RE.test(text);
  }

  // ── Contextual time fallback (only if no explicit time parsed) ──────────

  if (hours === null) {
    if (TONIGHT_RE.test(text) || THIS_EVENING_RE.test(text)) {
      hours = 20; minutes = 0;
    } else if (THIS_MORNING_RE.test(text)) {
      hours = 9; minutes = 0;
    } else if (THIS_AFTERNOON_RE.test(text)) {
      hours = 13; minutes = 0;
    }
  }

  if (!hasDate) return null;

  // ── Smart rollover: if the resolved time has already passed today
  //    and the user didn't explicitly say "today", push to tomorrow.
  //    e.g. "in the morning at 9:30am" said at 3pm → tomorrow 9:30am
  if (hours !== null && !explicitToday) {
    const resolvedDate = new Date(targetYear, targetMonth, targetDay);
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const isTargetToday = resolvedDate.getTime() === todayDate.getTime();
    if (isTargetToday && (hours < now.getHours() || (hours === now.getHours() && minutes <= now.getMinutes()))) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      targetYear  = tomorrow.getFullYear();
      targetMonth = tomorrow.getMonth();
      targetDay   = tomorrow.getDate();
      console.log("[REMINDER PARSE] Time already passed today, rolling to tomorrow");
    }
  }

  const dateStr = [
    targetYear,
    String(targetMonth + 1).padStart(2, "0"),
    String(targetDay).padStart(2, "0"),
  ].join("-");
  const timeStr = hours !== null ? fmtTime(hours, minutes) : null;

  const scheduled_for = timeStr
    ? `${dateStr}T${timeStr}:00`
    : `${dateStr}T00:00:00`;

  return { scheduled_for, date: dateStr, time: timeStr };
}

// ── Title cleaning ────────────────────────────────────────────────────────────

const TIME_STRIP_PATTERNS = [
  IN_DURATION_RE,
  SPECIFIC_TIME_RE,
  BARE_TIME_RE,
  /\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i,
  AT_BARE_HOUR_RE,
  /\b(today|tomorrow|tonight)\b/gi,
  /\b(?:this|in the)\s+(morning|afternoon|evening)\b/gi,
  /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
  /\b(in\s+\d+\s*(?:hours?|hrs?|minutes?|mins?))\b/gi,
];

const LEADING_JUNK_RE = /^(?:to|for|about|that|me|the|my|a|an|i need to|i have to|i should|i must)\s+/i;

export function cleanActionTitle(raw: string): string {
  let t = raw.trim();

  for (const re of TIME_STRIP_PATTERNS) {
    t = t.replace(re, " ");
  }

  t = t.replace(/\s{2,}/g, " ").trim();
  t = t.replace(/[.,!?;:]+$/, "").trim();

  for (let i = 0; i < 4; i++) {
    const before = t;
    t = t.replace(LEADING_JUNK_RE, "").trim();
    if (t === before) break;
  }

  if (!t) return "";

  t = t.charAt(0).toUpperCase() + t.slice(1);

  return t.slice(0, 120);
}

// ── Quality validation ────────────────────────────────────────────────────────

const NOISE_WORDS = new Set([
  "a", "an", "the", "my", "me", "i", "to", "for", "of", "and", "or",
  "at", "in", "on", "it", "is", "that", "this", "with", "about",
]);

export function titleQuality(title: string): number {
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

// ── Intent detection ──────────────────────────────────────────────────────────

interface IntentMatch {
  intent: ChatIntent;
  rawBody: string;
  fullMatch: string;
}

interface IntentPattern {
  intent: ChatIntent;
  re: RegExp;
  bodyIdx: number;
}

const INTENT_PATTERNS: IntentPattern[] = [
  // ── Reminder (highest priority — explicit user request for a nudge) ──────
  { intent: "reminder", re: /\b(?:remind me in)\s+\d+\s*(?:hours?|hrs?|minutes?|mins?)\s+to\s+(.+)/i, bodyIdx: 1 },
  { intent: "reminder", re: /\b(?:can you |could you |please )?(?:set a reminder|create a reminder)\s+(?:to|for|about)\s+(.+)/i, bodyIdx: 1 },
  { intent: "reminder", re: /\b(?:can you |could you |please )?(?:remind me to|remind me about|remind me that)\s+(.+)/i, bodyIdx: 1 },
  { intent: "reminder", re: /\b(?:can you |could you |please )?remind me\s+(?:i need to|i have to|i should)\s+(.+)/i, bodyIdx: 1 },
  { intent: "reminder", re: /\b(?:don'?t let me forget to|don'?t forget to)\s+(.+)/i, bodyIdx: 1 },
  { intent: "reminder", re: /\b(?:nudge me|ping me|follow up with me)\s+(?:to|about|on|when|if)\s+(.+)/i, bodyIdx: 1 },
  { intent: "reminder", re: /\b(?:set a reminder|create a reminder)\s+(.+)/i, bodyIdx: 1 },
  { intent: "reminder", re: /\breminder\s+(?:to|for)\s+(.+)/i, bodyIdx: 1 },
  { intent: "reminder", re: /\b(?:can you |could you |please )?remind me\b.{0,30}\b(?:to|about|that)\s+(.+)/i, bodyIdx: 1 },

  // ── Memory (user explicitly asks to store context) ──────────────────────
  { intent: "memory", re: /\b(?:remember that|remember this[,:.]?)\s+(.+)/i, bodyIdx: 1 },
  { intent: "memory", re: /\b(?:keep in mind|for context|for reference|note that|fyi)[,:.]?\s+(.+)/i, bodyIdx: 1 },
  { intent: "memory", re: /\b(?:i (?:always |usually |generally )?prefer)\s+(.+?)(?:\.|$)/i, bodyIdx: 1 },
  { intent: "memory", re: /\b(?:i'?m? allergic to|i can'?t eat|i don'?t eat)\s+(.+?)(?:\.|$)/i, bodyIdx: 1 },
  { intent: "memory", re: /\b(?:my (?:wife|husband|partner|daughter|son|kid|child|mom|dad|boss|doctor)(?:'s| is| name))\s+(.+?)(?:\.|$)/i, bodyIdx: 1 },

  // ── Event (scheduled occurrence, not a to-do) ───────────────────────────
  // Capture from the event noun onwards so titles include "Meeting with..." not just "with..."
  { intent: "event", re: /\bi have (?:a |an )?(?:doctor'?s? )?((?:meeting|appointment|call|interview|session)\b.+)/i, bodyIdx: 1 },
  { intent: "event", re: /\bi have (?:a |an )?((?:game|practice|match|recital|concert|class)\b.+)/i, bodyIdx: 1 },
  { intent: "event", re: /\b((?:dinner|lunch|brunch|breakfast|drinks|coffee) (?:at|with)\s+.+)/i, bodyIdx: 1 },
  { intent: "event", re: /\b(?:schedule (?:a |an )?)((?:meeting|appointment|call|interview|session|game|practice|class)\b.+)/i, bodyIdx: 1 },
  { intent: "event", re: /\b(?:put on (?:the |my )?calendar)\s+(.+)/i, bodyIdx: 1 },
  { intent: "event", re: /\b(i'?m? (?:meeting|seeing|visiting|going to see)\s+.+?)(?:\.|$)/i, bodyIdx: 1 },

  // ── Question (user asking for advice/analysis — no persistence) ─────────
  { intent: "question", re: /\b(?:what should i|how should i|how do i|how can i)\s+(.+)/i, bodyIdx: 1 },
  { intent: "question", re: /\b(?:help me (?:think|figure|plan|decide|understand|work))\s+(.+)/i, bodyIdx: 1 },
  { intent: "question", re: /\b(?:what do you (?:think|recommend|suggest))\s+(.+)/i, bodyIdx: 1 },
  { intent: "question", re: /\b(?:can you (?:help|explain|analyze|compare))\s+(.+)/i, bodyIdx: 1 },
  { intent: "question", re: /\b(?:should i|would you|do you think)\s+(.+)/i, bodyIdx: 1 },

  // ── Task (actionable to-do the user commits to) ─────────────────────────
  { intent: "task", re: /\b(?:add (?:a )?(?:task|to-?do))[,:.]?\s+(.+)/i, bodyIdx: 1 },
  { intent: "task", re: /\b(?:put (?:on|it on) (?:my )?(?:list|to-?do))[,:.]?\s+(.+)/i, bodyIdx: 1 },
  { intent: "task", re: /\b(?:i need to|i have to|i must|i gotta)\s+(.+?)(?:\.|$)/i, bodyIdx: 1 },
  { intent: "task", re: /\b(?:i should|i want to|i'?d like to)\s+(.+?)(?:\.|$)/i, bodyIdx: 1 },
  { intent: "task", re: /\b(?:i'll|i will)\s+(.+?)(?:\.|$)/i, bodyIdx: 1 },
  { intent: "task", re: /\b(?:need to|have to)\s+(.+?)(?:\.|$)/i, bodyIdx: 1 },
];

function detectIntent(text: string): IntentMatch | null {
  for (const { intent, re, bodyIdx } of INTENT_PATTERNS) {
    const match = text.match(re);
    if (!match?.[bodyIdx]) continue;
    return {
      intent,
      rawBody: match[bodyIdx].trim(),
      fullMatch: match[0],
    };
  }
  return null;
}

// ── Domain detection ──────────────────────────────────────────────────────────

const DOMAIN_KEYWORDS: Record<string, RegExp> = {
  health:   /\b(workout|exercise|gym|doctor|dentist|therapy|sleep|diet|medicine|prescription|run|yoga|walk|weight|appointment|checkup|health|wellness|recovery)\b/i,
  money:    /\b(pay|bill|rent|mortgage|budget|invoice|tax|bank|credit|loan|insurance|401k|savings|invest|financial|refund|expense)\b/i,
  life:     /\b(call|email|text|pick up|drop off|grocery|cook|clean|laundry|errand|family|kid|school|homework|birthday|anniversary|gift|party|trip|vacation|car|house|apartment|move|contractor|plumber|mechanic)\b/i,
};

function detectDomain(text: string): string | null {
  for (const [domain, re] of Object.entries(DOMAIN_KEYWORDS)) {
    if (re.test(text)) return domain;
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

// ── Main router ───────────────────────────────────────────────────────────────

const PERSISTABLE: Set<ChatIntent> = new Set(["task", "reminder", "event"]);

/**
 * Route a user message to a structured intent result.
 * This is the single canonical entry point for all chat message classification.
 * Only processes the LAST user message to avoid re-extracting from history.
 */
export function routeChatMessage(
  messages: { role: string; content: string }[],
): ChatAction {
  const none: ChatAction = {
    intent: "none", title: "", body: null,
    date: null, time: null, scheduled_for: null, domain: null,
    confidence: 0, should_persist: false, clarification_needed: false,
    reason: "no_match", source_text: "",
  };

  const userMessages = messages.filter((m) => m.role === "user");
  if (userMessages.length === 0) return none;
  const text = userMessages[userMessages.length - 1].content;
  none.source_text = text;

  if (text.length < 5) return { ...none, reason: "too_short" };

  const intent = detectIntent(text);
  if (!intent) {
    console.log("[CHAT ROUTER] no intent match:", text.slice(0, 80));
    return none;
  }

  const isPersistable = PERSISTABLE.has(intent.intent);
  const title = isPersistable ? cleanActionTitle(intent.rawBody) : intent.rawBody.slice(0, 120);
  const quality = isPersistable ? titleQuality(title) : 0.85;
  const schedule = parseSchedule(text);
  const domain = detectDomain(text);

  // Quality gate for persistable intents
  if (isPersistable && quality < MIN_QUALITY) {
    console.log("[CHAT ROUTER] rejected: quality too low", { intent: intent.intent, title, quality });
    return {
      intent: intent.intent,
      title,
      body: text.length > title.length + 10 ? text : null,
      date: schedule?.date ?? null,
      time: schedule?.time ?? null,
      scheduled_for: schedule?.scheduled_for ?? null,
      domain,
      confidence: quality,
      should_persist: false,
      clarification_needed: true,
      reason: "low_quality_title",
      source_text: text,
    };
  }

  const confidence = isPersistable
    ? quality * (schedule ? 1.0 : 0.85)
    : 0.85;

  const action: ChatAction = {
    intent:               intent.intent,
    title,
    body:                 text.length > title.length + 10 ? text : null,
    date:                 schedule?.date ?? null,
    time:                 schedule?.time ?? null,
    scheduled_for:        schedule?.scheduled_for ?? null,
    domain,
    confidence,
    should_persist:       isPersistable && confidence >= 0.5,
    clarification_needed: isPersistable && confidence < 0.5,
    reason:               isPersistable ? "matched" : intent.intent,
    source_text:          text,
  };

  console.log("[CHAT ROUTER]", {
    raw: text.slice(0, 80),
    intent: action.intent,
    confidence: action.confidence,
    title: action.title.slice(0, 50),
    scheduled_for: action.scheduled_for,
    should_persist: action.should_persist,
    domain: action.domain,
  });

  return action;
}

/**
 * @deprecated Use routeChatMessage instead.
 * Compatibility wrapper that returns null for non-persistable intents.
 */
export function extractChatAction(
  messages: { role: string; content: string }[],
): ChatActionCompat | null {
  const result = routeChatMessage(messages);
  if (!result.should_persist) return null;
  return { ...result, type: result.intent };
}
