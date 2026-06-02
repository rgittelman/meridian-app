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
 * Implicit timed captures ("call Matt at 3pm") are NOT detected in V1.
 * Time resolution handles both relative ("in 20 minutes") and absolute ("at 3pm").
 */

import type { LifeObject } from '@/types/capture';
import { resolveCapturePlanTime } from '@/services/plan/resolveCapturePlanTime';

// ── Intent detection ──────────────────────────────────────────────────────────

const TRIGGER_PATTERNS = [
  /^remind\s+me\s+to\s+/i,
  /^remind\s+me\s+at\s+/i,
  /^reminder\s+to\s+/i,
  /^notify\s+me\s+to\s+/i,
  /^alert\s+me\s+to\s+/i,
  /^ping\s+me\s+to\s+/i,
];

/** Matches trailing time phrases to strip from task text. */
const TRAILING_TIME_PATTERN =
  /\s+(in\s+\d+\s+(?:minute|minutes|hour|hours)|at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?|tomorrow(?:\s+(?:morning|afternoon|evening))?|\w+day(?:\s+at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?)$/i;

export type ReminderIntentResult =
  | { hasIntent: true; taskText: string }
  | { hasIntent: false };

/**
 * Returns whether the raw capture text contains explicit reminder intent,
 * and if so, the cleaned task text with the trigger phrase and time stripped.
 */
export function detectReminderIntent(raw: string): ReminderIntentResult {
  const trimmed = raw.trim();

  for (const pattern of TRIGGER_PATTERNS) {
    if (pattern.test(trimmed)) {
      // Strip the trigger prefix
      let taskText = trimmed.replace(pattern, '').trim();

      // Strip trailing time expression so copy reads cleanly
      taskText = taskText.replace(TRAILING_TIME_PATTERN, '').trim();

      // Capitalise first letter
      if (taskText.length > 0) {
        taskText = taskText.charAt(0).toUpperCase() + taskText.slice(1);
      }

      if (!taskText) return { hasIntent: false };

      return { hasIntent: true, taskText };
    }
  }

  return { hasIntent: false };
}

// ── Time resolution ───────────────────────────────────────────────────────────

/** Matches "in X minute(s)" or "in X hour(s)". */
const RELATIVE_TIME_PATTERN = /\bin\s+(\d+)\s+(minute|minutes|hour|hours)\b/i;

/** Max days ahead to schedule a capture reminder. */
const MAX_REMINDER_DAYS = 7;

/**
 * Resolves the absolute reminder time from a capture.
 *
 * Two-stage:
 *   1. Relative expression in raw text: "in 20 minutes", "in 1 hour"
 *   2. Absolute time from capture's parsed timing: "at 3pm", "tomorrow at 10am"
 *
 * Returns null when:
 *   - No time signal found
 *   - Resolved time is already in the past
 *   - Resolved time is more than MAX_REMINDER_DAYS away
 */
export function resolveReminderTime(capture: LifeObject, now: Date): Date | null {
  const raw = capture.raw ?? '';
  const nowMs = now.getTime();

  // Stage 1 — relative time ("in X minutes / hours")
  const relativeMatch = RELATIVE_TIME_PATTERN.exec(raw);
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1], 10);
    const unit = relativeMatch[2].toLowerCase();
    const offsetMs = unit.startsWith('hour') ? amount * 60 * 60 * 1000 : amount * 60 * 1000;
    const target = new Date(nowMs + offsetMs);
    if (target.getTime() > nowMs) return target;
  }

  // Stage 2 — absolute time from parsed timing
  const resolved = resolveCapturePlanTime(capture, now);
  if (!resolved) return null;

  const { startTime } = resolved;
  if (startTime.getTime() <= nowMs) return null;
  if (startTime.getTime() - nowMs > MAX_REMINDER_DAYS * 24 * 60 * 60 * 1000) return null;

  return startTime;
}
