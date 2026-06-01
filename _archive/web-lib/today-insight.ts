/**
 * Today Insight Generator — Phase 1
 *
 * Uses the centralized AI service to generate a single ambient insight
 * for the Today page. Falls back silently if no AI provider is available.
 */

import type { TodayData } from "./today-data";
import { aiComplete, isAIAvailable } from "./ai/service";

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

/**
 * Returns an AI-generated insight, or a contextual fallback.
 * Never throws — always returns a string.
 */
export async function generateTodayInsight(data: TodayData): Promise<string> {
  try {
    if (!(await isAIAvailable())) return getFallback();

    const result = await aiComplete({
      messages:    [{ role: "user", content: buildPrompt(data) }],
      maxTokens:   60,
      temperature: 0.4,
    });

    const text = result.content.trim().replace(/^["']|["']$/g, "");
    return text.length > 4 ? text : getFallback();
  } catch {
    return getFallback();
  }
}
