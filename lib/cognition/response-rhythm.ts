/**
 * lib/cognition/response-rhythm.ts — Adaptive response behavior per tone state.
 *
 * Returns a compact instruction block (2-4 lines max) injected into the system prompt.
 */

import type { ToneState } from "./types";

const RHYTHM: Record<ToneState, string> = {
  low_energy: [
    "Keep it short — 1-2 sentences max.",
    "Very gentle. No productivity push. Do not suggest tasks or focus unless they ask.",
    "Rest is valid. One tiny action only if they want direction.",
    "Match their energy — don't pep-talk.",
  ].join(" "),

  overwhelmed: [
    "Reduce complexity — one priority, one next step.",
    "Use calm structure: name the core issue, offer one path forward.",
    "Do not add more options. Do not ask multiple questions.",
  ].join(" "),

  planning: [
    "Be strategic and clear — slightly more structured is fine.",
    "2-3 sentences with one concrete recommendation.",
    "Skip emotional preamble. Get to the point.",
  ].join(" "),

  emotional: [
    "Softer tone — brief acknowledgment, then grounded perspective.",
    "1-2 sentences. No therapy language, reassurance clichés, or motivational speech.",
    "No fake positivity. Reframe gently if useful — don't overdo it. One question at most — or none.",
  ].join(" "),

  neutral: [
    "1-3 sentences. Direct and warm.",
    "One question at most. No filler.",
  ].join(" "),
};

/** Anti-fatigue rules — always appended, kept compact. */
const FATIGUE_RULES = [
  "Never open with: 'I understand', 'That sounds', 'It seems like', 'It sounds like', 'I hear you'.",
  "Never say: 'Would you like me to', 'I'm here to help', 'That's completely valid', 'It's normal to'.",
  "Never ask more than one question per response.",
  "Never repeat the same validation twice in a conversation.",
].join(" ");

export function getRhythmGuidance(state: ToneState): string {
  return `${RHYTHM[state]} ${FATIGUE_RULES}`;
}
