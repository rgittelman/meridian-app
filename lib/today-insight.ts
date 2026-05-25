/**
 * Today Insight Generator — Phase 1
 *
 * Calls Ollama server-side at page render time to generate a single
 * ambient insight for the Today page. Falls back silently if Ollama
 * is unavailable or too slow — the page renders fine without it.
 *
 * Timeout is deliberately short (4 s) so it never blocks the page.
 */

import type { TodayData } from "./today-data";

const OLLAMA_URL = process.env.OLLAMA_URL   ?? "http://localhost:11434";
const MODEL      = process.env.OLLAMA_MODEL ?? "llama3.2:3b";
const TIMEOUT_MS = 4_000;

// ─── Prompt ───────────────────────────────────────────────────────────────────

function buildPrompt(data: TodayData): string {
  const h       = new Date().getHours();
  const phase   = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
  const open    = data.priorities.filter((p) => !p.done);
  const events  = data.events.map((e) => `${e.time} ${e.title}`).join(", ");

  return `You are Meridian — a calm, observant personal intelligence system. \
Generate exactly ONE ambient insight for the user's Today view. \
The insight should feel like a quiet, thoughtful observation, not advice or a command.

Context:
- Time of day: ${phase}
- Open priorities: ${open.map((p) => p.text).join(", ") || "none"}
- Calendar today: ${events || "no events"}
- Energy level: ${data.context.energyLevel}
- Calendar load: ${data.context.calendarLoad}
- Focus trend: ${data.context.focusTrend}
- Focus window: ${data.context.focusWindow ?? "unknown"}

Rules:
- Maximum 16 words
- Observational only — never prescriptive
- Warm but restrained tone
- No exclamation marks
- Do not start with "You should" or "Try to"
- Good examples: "Your strongest focus window opens after 10:30."
                 "Recovery is trending upward this week."
                 "Today has more uninterrupted space than usual."
- Return ONLY the insight text — no quotes, no preamble.`;
}

// ─── Fallback pool ────────────────────────────────────────────────────────────
// Used when Ollama is unavailable. Rotated by hour so it doesn't feel static.

const FALLBACKS = [
  "Your mornings tend to support deeper thinking.",
  "You've protected more uninterrupted time lately.",
  "Recovery is trending upward.",
  "Today has a quieter stretch before the afternoon.",
  "Your focus window is open now.",
  "Lighter calendar than last week.",
  "You tend to think more clearly before noon.",
  "A good window for strategic thinking is ahead.",
];

function getFallback(): string {
  return FALLBACKS[new Date().getHours() % FALLBACKS.length];
}

// ─── Generator ────────────────────────────────────────────────────────────────

/**
 * Returns an AI-generated insight, or a contextual fallback.
 * Never throws — always returns a string.
 */
export async function generateTodayInsight(data: TodayData): Promise<string> {
  try {
    const controller = new AbortController();
    const timer      = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ model: MODEL, prompt: buildPrompt(data), stream: false }),
      signal:  controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) return getFallback();

    const json = await res.json() as { response?: string };
    const text = (json.response ?? "").trim().replace(/^["']|["']$/g, "");

    return text.length > 4 ? text : getFallback();
  } catch {
    return getFallback();
  }
}
