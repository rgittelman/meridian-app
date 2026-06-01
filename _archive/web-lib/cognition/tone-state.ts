/**
 * lib/cognition/tone-state.ts — Lightweight tone-state detection.
 *
 * Heuristic-only — no LLM call. Runs in <1ms.
 * Analyzes the latest user message and recent turns.
 */

import type { ToneAnalysis, ToneState } from "./types";

const OVERWHELMED_RE =
  /\b(overwhelm|too much|too many|can't keep up|drowning|spread thin|everything at once|falling behind|swamped)\b/i;

const LOW_ENERGY_RE =
  /\b(tired|exhausted|drained|low energy|no energy|can't focus|foggy|wiped|burnt out|burned out|sluggish)\b/i;

const PLANNING_RE =
  /\b(plan|priorit|schedule|organize|structure|tomorrow|morning|focus|deadline|strategy|roadmap|calendar|what should i|help me figure|break down|week ahead)\b/i;

const EMOTIONAL_RE =
  /\b(feel(ing)?|stressed|anxious|worried|sad|frustrated|upset|lonely|hard day| struggling|overthinking|anxiety|down lately|can't handle|handle this)\b/i;

const SELF_CRITICISM_RE =
  /\b(mess(ing|ed)? up|terrible at|not good enough|hard on myself|stay(ing)? consistent|can't get it right|always mess|never get it right)\b/i;

const GOAL_RE =
  /\b(goal|long.?term|quarter|vision|building|working toward|trying to)\b/i;

interface DetectInput {
  query?:     string;
  messages?:  { role: "user" | "assistant"; content: string }[];
}

function scoreText(
  text: string,
  scores: Record<ToneState, number>,
  signals: string[],
  weight: number,
): void {
  if (!text.trim()) return;

  if (OVERWHELMED_RE.test(text)) { scores.overwhelmed += 2 * weight; if (weight >= 1) signals.push("overload_language"); }
  if (LOW_ENERGY_RE.test(text))  { scores.low_energy  += 2 * weight; if (weight >= 1) signals.push("low_energy_language"); }
  if (PLANNING_RE.test(text))    { scores.planning    += 1.5 * weight; if (weight >= 1) signals.push("planning_language"); }
  if (EMOTIONAL_RE.test(text))   { scores.emotional   += 2 * weight; if (weight >= 1) signals.push("emotional_language"); }
  if (SELF_CRITICISM_RE.test(text)) { scores.emotional += 2 * weight; if (weight >= 1) signals.push("self_criticism"); }
  if (GOAL_RE.test(text))        { scores.planning    += 0.5 * weight; if (weight >= 1) signals.push("goal_language"); }

  if (text.length < 40 && !PLANNING_RE.test(text) && weight >= 1) {
    scores.low_energy += 0.5;
  }

  const qCount = (text.match(/\?/g) ?? []).length;
  if (qCount >= 2 && weight >= 1) {
    scores.overwhelmed += 0.8;
    signals.push("multi_question");
  }
}

export function detectToneState(input: DetectInput): ToneAnalysis {
  const recentUser = (input.messages ?? [])
    .filter((m) => m.role === "user")
    .slice(-1)
    .map((m) => m.content);

  const queryText   = input.query ?? "";
  const historyText = recentUser.join(" ");
  const signals: string[] = [];

  if (!queryText.trim() && !historyText.trim()) {
    return { state: "neutral", confidence: 0.5, signals: [] };
  }

  const scores: Record<ToneState, number> = {
    overwhelmed: 0,
    low_energy:  0,
    planning:    0,
    emotional:   0,
    neutral:     0.1,
  };

  // Current message drives tone; prior turn is light context only
  if (queryText.trim()) {
    scoreText(queryText, scores, signals, 2);
    if (historyText) scoreText(historyText, scores, signals, 0.4);
  } else {
    scoreText(historyText, scores, signals, 1);
  }

  const entries = Object.entries(scores) as [ToneState, number][];
  entries.sort((a, b) => b[1] - a[1]);
  const [state, topScore] = entries[0];
  const secondScore = entries[1]?.[1] ?? 0;

  const confidence = topScore > 0
    ? Math.min(1, 0.5 + (topScore - secondScore) * 0.2)
    : 0.5;

  return { state: topScore > 0.5 ? state : "neutral", confidence, signals };
}
