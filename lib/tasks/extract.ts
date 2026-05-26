/**
 * lib/tasks/extract.ts — Lightweight task extraction from conversations.
 *
 * Heuristic-only — no LLM call. Parses user messages for commitments,
 * intentions, deadlines, and follow-through items.
 */

import { scoreDomains, domainsFromScores } from "@/lib/domains/scoring";
import type { ExtractedTask } from "./types";

const HARD_PATTERNS: { re: RegExp; titleIdx: number; due?: "tomorrow" | "friday" | "parsed"; verb?: string }[] = [
  { re: /\b(?:remind me to)\s+(.+?)(?:\.|$)/i, titleIdx: 1 },
  { re: /\b(?:i need to|i have to|i must)\s+(.+?)(?:\.|$)/i, titleIdx: 1 },
  { re: /\b(?:i'll|i will)\s+(.+?)(?:\.|$)/i, titleIdx: 1 },
  { re: /\b(?:need to|have to)\s+(.+?)(?:\s+tomorrow|\s+by\b|\.|$)/i, titleIdx: 1, due: "tomorrow" },
  { re: /\b(call|email|text|contact)\s+(?:the\s+)?(.+?)(?:\s+tomorrow|\s+by\b|\.|$)/i, titleIdx: 0 },
  { re: /\b(pick\s+up|drop\s+off)\s+(.+?)(?:\.|$)/i, titleIdx: 0 },
  { re: /\b(schedule|book|set\s+up|arrange)\s+(.+?)(?:\.|$)/i, titleIdx: 0 },
  { re: /\b(?:finish|complete|submit|send)\s+(.+?)\s+by\s+(friday|monday|tuesday|wednesday|thursday|saturday|sunday)/i, titleIdx: 1, due: "parsed" },
  { re: /\b(?:finish|complete)\s+(.+?)\s+by\s+(\d{1,2}\/\d{1,2}|\w+\s+\d{1,2})/i, titleIdx: 1, due: "parsed" },
];

const SOFT_PATTERNS: { re: RegExp; titleIdx: number; verb?: string }[] = [
  { re: /\b(?:i should|i want to|i'd like to|maybe i should)\s+(.+?)(?:\.|$)/i, titleIdx: 1 },
  { re: /\b(?:start|try|begin)\s+(.+?)(?:\.|$)/i, titleIdx: 1 },
];

const DAY_MAP: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

function nextWeekday(dayName: string): string {
  const target = DAY_MAP[dayName.toLowerCase()];
  if (target === undefined) return new Date().toISOString().split("T")[0];
  const d = new Date();
  const diff = (target - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

function tomorrowDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

const TIME_CONTEXT_RE = /\s+(tomorrow|today|tonight|this\s+(?:morning|afternoon|evening)|(?:by|before|after|at)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?|(?:by|before|at)\s+(?:friday|monday|tuesday|wednesday|thursday|saturday|sunday))\b.*/i;

function cleanTitle(raw: string, verb?: string): string {
  let title = raw.trim().slice(0, 150);

  const timeMatch = title.match(TIME_CONTEXT_RE);
  const timeContext = timeMatch?.[1]?.trim() ?? "";
  title = title.replace(TIME_CONTEXT_RE, "").trim();

  if (title.length < 3) return title;

  title = normalizeTitle(title, verb);

  if (timeContext) {
    title = `${title} ${timeContext.toLowerCase()}`;
  }

  return title.slice(0, 120);
}

const STOP_WORDS = new Set(["a", "an", "the", "my", "our", "his", "her", "their", "up", "at", "in", "on", "to", "for", "of", "and", "or", "it", "is"]);

function normalizeTitle(raw: string, verb?: string): string {
  let t = raw.trim();
  if (!t) return t;

  t = t.replace(/\bi\b/g, "I");
  t = t.replace(/\bi'm\b/gi, "I'm");
  t = t.replace(/\bi'll\b/gi, "I'll");
  t = t.replace(/\bi've\b/gi, "I've");
  t = t.replace(/\bi'd\b/gi, "I'd");

  t = t.charAt(0).toUpperCase() + t.slice(1);

  t = t.replace(/\b([a-z])([a-z]*)\b/g, (full, first, rest) => {
    if (STOP_WORDS.has(full)) return full;
    if (full.length >= 3 && /^[a-z]/.test(full)) {
      const isLikelyName = !STOP_WORDS.has(full) && /^[a-z]{3,}$/.test(full);
      if (!isLikelyName) return full;
    }
    return full;
  });

  const words = t.split(/\s+/).filter(Boolean);
  if (words.length <= 1 && verb) {
    const capVerb = verb.charAt(0).toUpperCase() + verb.slice(1);
    t = `${capVerb} ${t.charAt(0).toLowerCase() + t.slice(1)}`;
  }

  t = t.charAt(0).toUpperCase() + t.slice(1);

  return t;
}

function domainsForText(text: string): string[] {
  const scores = scoreDomains({
    category: "unfinished_tasks",
    title:    text.slice(0, 40),
    content:  text,
  });
  return domainsFromScores(scores);
}

/** Extract tasks from user messages only. */
export function extractTasksFromMessages(
  messages: { role: string; content: string }[],
): ExtractedTask[] {
  const userText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n");

  if (userText.length < 10) return [];

  const found: ExtractedTask[] = [];
  const seen = new Set<string>();

  function add(task: ExtractedTask) {
    const key = task.title.toLowerCase();
    if (key.length < 4) return;

    const dupIdx = found.findIndex((f) => {
      const fk = f.title.toLowerCase();
      return fk === key || fk.includes(key) || key.includes(fk);
    });

    if (dupIdx >= 0) {
      if (key.length > found[dupIdx].title.length) found[dupIdx] = task;
      return;
    }

    if (seen.has(key)) return;
    seen.add(key);
    found.push(task);
  }

  for (const { re, titleIdx, due } of HARD_PATTERNS) {
    const match = userText.match(re);
    if (!match) continue;
    const rawTitle = titleIdx === 0 ? match[0] : match[titleIdx];
    if (!rawTitle) continue;
    const verb = titleIdx === 0 ? undefined : match[0].split(/\s/)[0];
    const title = cleanTitle(rawTitle, verb);
    let due_date: string | undefined;
    if (due === "tomorrow" || /\btomorrow\b/i.test(match[0])) due_date = tomorrowDate();
    else if (due === "parsed" && match[2]) {
      const day = match[2].toLowerCase();
      due_date = DAY_MAP[day] !== undefined ? nextWeekday(day) : undefined;
    }
    if (!due_date && /\btomorrow\b/i.test(match[0])) due_date = tomorrowDate();
    add({
      title,
      task_type:  "hard",
      confidence: due_date ? 0.82 : 0.75,
      due_date,
      domains:    domainsForText(title) as ExtractedTask["domains"],
      source_excerpt: match[0].slice(0, 200),
    });
  }

  for (const { re, titleIdx } of SOFT_PATTERNS) {
    const match = userText.match(re);
    if (!match?.[titleIdx]) continue;
    const title = cleanTitle(match[titleIdx]);
    add({
      title,
      task_type:  "soft",
      confidence: 0.62,
      domains:    domainsForText(title) as ExtractedTask["domains"],
      source_excerpt: match[0].slice(0, 200),
    });
  }

  return found.slice(0, 5);
}
