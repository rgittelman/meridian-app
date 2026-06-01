/**
 * lib/reminders/extract.ts — Extract explicit reminder requests from chat messages.
 *
 * Detects patterns like "remind me to X at Y" or "set a reminder for Z"
 * and creates real reminders with parsed times.
 */

import type { ReminderCandidate } from "./types";

interface ParsedTime {
  scheduled_for: string;
  scheduled_date: string;
}

const REMINDER_PATTERNS: RegExp[] = [
  /\b(?:remind me to|remind me about|set a reminder (?:to|for|about)?)\s+(.+)/i,
  /\b(?:reminder:?)\s+(.+)/i,
  /\b(?:don'?t let me forget to|don'?t forget to)\s+(.+)/i,
];

const TIME_RE = /\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i;
const TODAY_RE = /\btoday\b/i;
const TOMORROW_RE = /\btomorrow\b/i;
const TONIGHT_RE = /\btonight\b/i;
const THIS_MORNING_RE = /\bthis\s+morning\b/i;
const THIS_AFTERNOON_RE = /\bthis\s+afternoon\b/i;
const THIS_EVENING_RE = /\bthis\s+evening\b/i;

function parseTimeFromText(text: string): ParsedTime | null {
  const now = new Date();
  let targetDate = new Date(now);

  if (TOMORROW_RE.test(text)) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  const dateStr = [
    targetDate.getFullYear(),
    String(targetDate.getMonth() + 1).padStart(2, "0"),
    String(targetDate.getDate()).padStart(2, "0"),
  ].join("-");

  const timeMatch = text.match(TIME_RE);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const ampm = timeMatch[3].toLowerCase();

    if (ampm === "pm" && hours !== 12) hours += 12;
    if (ampm === "am" && hours === 12) hours = 0;

    targetDate.setHours(hours, minutes, 0, 0);

    if (TOMORROW_RE.test(text)) {
      const tmrw = new Date(now);
      tmrw.setDate(tmrw.getDate() + 1);
      targetDate = new Date(tmrw);
      targetDate.setHours(hours, minutes, 0, 0);
    }

    return { scheduled_for: targetDate.toISOString(), scheduled_date: dateStr };
  }

  if (TONIGHT_RE.test(text) || THIS_EVENING_RE.test(text)) {
    targetDate.setHours(20, 0, 0, 0);
    return { scheduled_for: targetDate.toISOString(), scheduled_date: dateStr };
  }

  if (THIS_MORNING_RE.test(text)) {
    targetDate.setHours(9, 0, 0, 0);
    return { scheduled_for: targetDate.toISOString(), scheduled_date: dateStr };
  }

  if (THIS_AFTERNOON_RE.test(text)) {
    targetDate.setHours(13, 0, 0, 0);
    return { scheduled_for: targetDate.toISOString(), scheduled_date: dateStr };
  }

  if (TODAY_RE.test(text) || TOMORROW_RE.test(text)) {
    return { scheduled_for: targetDate.toISOString(), scheduled_date: dateStr };
  }

  return null;
}

function cleanReminderTitle(raw: string): string {
  let title = raw.trim();

  title = title.replace(TIME_RE, "").trim();
  title = title.replace(/\b(today|tomorrow|tonight|this\s+(?:morning|afternoon|evening))\b/gi, "").trim();
  title = title.replace(/\s{2,}/g, " ").trim();
  title = title.replace(/[.!,]+$/, "").trim();

  if (!title) return raw.trim().slice(0, 80);

  title = title.charAt(0).toUpperCase() + title.slice(1);
  return title.slice(0, 120);
}

/**
 * Extract explicit reminder requests from user messages.
 * Returns reminder candidates ready for persistence.
 */
export function extractRemindersFromMessages(
  messages: { role: string; content: string }[],
): ReminderCandidate[] {
  const userTexts = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content);

  const candidates: ReminderCandidate[] = [];
  const seenTitles = new Set<string>();

  for (const text of userTexts) {
    for (const pattern of REMINDER_PATTERNS) {
      const match = text.match(pattern);
      if (!match?.[1]) continue;

      const rawBody = match[1].trim();
      if (rawBody.length < 3) continue;

      const title = cleanReminderTitle(rawBody);
      const key = title.toLowerCase();
      if (seenTitles.has(key)) continue;
      seenTitles.add(key);

      const parsed = parseTimeFromText(text);

      candidates.push({
        title,
        reminder_type: "manual",
        scheduled_for: parsed?.scheduled_for,
        why_shown: "You asked for this reminder",
        domains: [],
      });

      console.log("[reminders/extract] found:", { title, scheduled_for: parsed?.scheduled_for, source: text.slice(0, 80) });
      break;
    }
  }

  return candidates.slice(0, 3);
}
