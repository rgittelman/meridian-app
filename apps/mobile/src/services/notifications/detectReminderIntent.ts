/**
 * Pure reminder intent detection — no NLP, no AI, deterministic only.
 *
 * Approved V1 trigger phrases (Codemaster):
 *   remind me to / remind me at
 *   reminder to
 *   notify me to
 *   alert me to
 *   ping me to
 *
 * Also handles mid-sentence "before" offsets:
 *   "Call mom at 2pm. Remind me 5 minutes before."
 *   → task: "Call mom", time: 2pm - 5 min = 1:55pm
 *
 * Implicit timed captures ("call Matt at 3pm") are NOT detected in V1.
 */

import type { LifeObject } from '@/types/capture';
import { resolveCapturePlanTime } from '@/services/plan/resolveCapturePlanTime';

// ── Intent detection ──────────────────────────────────────────────────────────

/** Patterns anchored to start of string — existing trigger phrases. */
const START_TRIGGER_PATTERNS = [
  /^remind\s+me\s+to\s+/i,
  /^remind\s+me\s+at\s+/i,
  /^reminder\s+to\s+/i,
  /^notify\s+me\s+to\s+/i,
  /^alert\s+me\s+to\s+/i,
  /^ping\s+me\s+to\s+/i,
];

/**
 * Mid-sentence "remind me X minutes/hours before" pattern.
 * Captures: (1) offset amount, (2) unit.
 * Examples:
 *   "Call mom at 2pm today. Remind me 5 minutes before."
 *   "Pick up Grace at 5:30. Remind me 15 minutes before."
 */
const BEFORE_OFFSET_PATTERN =
  /remind\s+me\s+(\d+)\s+(minute|minutes|hour|hours)\s+before\b/i;

/** Matches trailing time phrases to strip from task text. */
const TRAILING_TIME_PATTERN =
  /\s+(in\s+\d+\s+(?:minute|minutes|hour|hours)|at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?(?:\s+today|tonight|tomorrow)?|tomorrow(?:\s+(?:morning|afternoon|evening))?|\w+day(?:\s+at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?)[\s.!?]*$/i;

/** Strips trailing punctuation and whitespace. */
const TRAILING_PUNCT = /[\s.!?,]+$/;

function capitalise(s: string): string {
  return s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export type ReminderIntentResult =
  | { hasIntent: false }
  | {
      hasIntent: true;
      taskText: string;
      /**
       * When set, the reminder should fire this many ms BEFORE the capture's
       * resolved anchor time — used for "remind me X minutes before [time]".
       */
      beforeOffsetMs?: number;
    };

/**
 * Returns whether the raw capture text contains explicit reminder intent,
 * and if so, the cleaned task text (trigger phrase and time stripped).
 */
export function detectReminderIntent(raw: string): ReminderIntentResult {
  const trimmed = raw.trim();

  // ── Case 1: starts with a trigger phrase ───────────────────────────────────
  for (const pattern of START_TRIGGER_PATTERNS) {
    if (pattern.test(trimmed)) {
      let taskText = trimmed.replace(pattern, '').trim();
      taskText = taskText.replace(TRAILING_TIME_PATTERN, '').trim();
      taskText = taskText.replace(TRAILING_PUNCT, '').trim();
      taskText = capitalise(taskText);
      if (!taskText) return { hasIntent: false };
      return { hasIntent: true, taskText };
    }
  }

  // ── Case 2: mid-sentence "remind me X minutes/hours before" ───────────────
  // e.g. "Call mom at 2pm today. Remind me 5 minutes before."
  const beforeMatch = BEFORE_OFFSET_PATTERN.exec(trimmed);
  if (beforeMatch) {
    const amount = parseInt(beforeMatch[1], 10);
    const unit = beforeMatch[2].toLowerCase();
    const beforeOffsetMs = unit.startsWith('hour')
      ? amount * 60 * 60 * 1000
      : amount * 60 * 1000;

    // Task text = everything before the "remind me X before" clause,
    // with trailing time stripped.
    const phraseStart = trimmed.indexOf(beforeMatch[0]);
    const taskRaw = trimmed.slice(0, phraseStart).trim();
    let taskText = taskRaw
      .replace(TRAILING_TIME_PATTERN, '')
      .replace(TRAILING_PUNCT, '')
      .trim();
    taskText = capitalise(taskText);

    if (!taskText) return { hasIntent: false };
    return { hasIntent: true, taskText, beforeOffsetMs };
  }

  return { hasIntent: false };
}

// ── Time resolution ───────────────────────────────────────────────────────────

/** Matches "in X minute(s)" or "in X hour(s)". */
const RELATIVE_TIME_PATTERN = /\bin\s+(\d+)\s+(minute|minutes|hour|hours)\b/i;

/** Max days ahead to schedule a capture reminder. */
const MAX_REMINDER_DAYS = 7;

function isValidFutureTime(target: Date, nowMs: number): boolean {
  return (
    target.getTime() > nowMs &&
    target.getTime() - nowMs <= MAX_REMINDER_DAYS * 24 * 60 * 60 * 1000
  );
}

/**
 * Resolves the absolute reminder time from a capture.
 *
 * Three stages (in priority order):
 *   0. Before-offset: anchor time - beforeOffsetMs (e.g. "5 min before 2pm")
 *   1. Relative: "in 20 minutes", "in 1 hour" (from now)
 *   2. Absolute: parsed timing ("at 3pm", "tomorrow at 10am")
 *
 * Returns null when no resolvable future time exists.
 */
export function resolveReminderTime(
  capture: LifeObject,
  now: Date,
  intent?: ReminderIntentResult,
): Date | null {
  const raw = capture.raw ?? '';
  const nowMs = now.getTime();

  // Stage 0 — before-offset ("remind me X minutes before [anchor time]")
  if (intent && intent.hasIntent && intent.beforeOffsetMs !== undefined) {
    const resolved = resolveCapturePlanTime(capture, now);
    if (resolved) {
      const target = new Date(resolved.startTime.getTime() - intent.beforeOffsetMs);
      if (isValidFutureTime(target, nowMs)) return target;
    }
    // If anchor time isn't resolvable, fall through to other stages.
  }

  // Stage 1 — relative time ("in X minutes / hours")
  const relativeMatch = RELATIVE_TIME_PATTERN.exec(raw);
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1], 10);
    const unit = relativeMatch[2].toLowerCase();
    const offsetMs = unit.startsWith('hour') ? amount * 60 * 60 * 1000 : amount * 60 * 1000;
    const target = new Date(nowMs + offsetMs);
    if (isValidFutureTime(target, nowMs)) return target;
  }

  // Stage 2 — absolute time from parsed timing
  const resolved = resolveCapturePlanTime(capture, now);
  if (!resolved) return null;
  const { startTime } = resolved;
  if (!isValidFutureTime(startTime, nowMs)) return null;
  return startTime;
}
