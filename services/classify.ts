import type { ClassifyResult, MessageIntent } from "@/types";

// Stub classifier – keyword heuristics only.
// Will be replaced with an OpenAI call in the next iteration.
export function classify(text: string): ClassifyResult {
  const lower = text.toLowerCase();

  const rules: [RegExp, MessageIntent][] = [
    [/remind|reminder|alert|notify/i, "reminder"],
    [/sleep|exercise|workout|mood|weight|calories|health/i, "health"],
    [/spend|spent|buy|bought|cost|price|budget|money|dollar|\$/i, "money"],
    [/task|todo|to-do|add|create|schedule/i, "task"],
    [/what|how|why|when|where|who|explain|tell me/i, "question"],
  ];

  for (const [pattern, intent] of rules) {
    if (pattern.test(lower)) {
      return { intent, confidence: 0.6 };
    }
  }

  return { intent: "unknown", confidence: 0 };
}
