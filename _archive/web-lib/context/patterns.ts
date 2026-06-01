/**
 * lib/context/patterns.ts — Recurring pattern detection.
 *
 * Surfaces behavioral and emotional patterns from the memory graph.
 * Used by the context engine and future proactive intelligence layer.
 */

import type { Memory } from "@/lib/memory/types";
import { MEMORY_CATEGORY_LABELS } from "@/lib/memory/constants";

export interface DetectedPattern {
  type:        "category_frequency" | "reinforcement" | "emotional" | "temporal";
  label:       string;
  description: string;
  strength:    number;
  memoryIds:   string[];
}

/** Detect patterns across a user's full memory set. */
export function detectPatterns(memories: Memory[]): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  const active = memories.filter((m) => m.is_active);

  // Category frequency patterns
  const byCategory: Record<string, Memory[]> = {};
  for (const m of active) {
    (byCategory[m.category] ??= []).push(m);
  }

  for (const [category, mems] of Object.entries(byCategory)) {
    if (mems.length >= 3) {
      patterns.push({
        type:        "category_frequency",
        label:       MEMORY_CATEGORY_LABELS[category as keyof typeof MEMORY_CATEGORY_LABELS] ?? category,
        description: `${mems.length} memories in this area suggest it's a recurring theme.`,
        strength:    Math.min(1, mems.length / 10),
        memoryIds:   mems.map((m) => m.id),
      });
    }
  }

  // High-reinforcement patterns (mentioned repeatedly)
  const reinforced = active.filter((m) => m.reinforcement_count >= 3);
  for (const m of reinforced.slice(0, 5)) {
    patterns.push({
      type:        "reinforcement",
      label:       m.title,
      description: `Referenced ${m.reinforcement_count} times — likely a core theme.`,
      strength:    Math.min(1, m.reinforcement_count / 8),
      memoryIds:   [m.id],
    });
  }

  // Emotional valence patterns
  const negativeEmotional = active.filter(
    (m) => m.emotional_valence === "negative" && m.emotional_intensity >= 0.5,
  );
  if (negativeEmotional.length >= 2) {
    patterns.push({
      type:        "emotional",
      label:       "Elevated stress signals",
      description: `${negativeEmotional.length} emotionally charged memories detected recently.`,
      strength:    Math.min(1, negativeEmotional.length / 5),
      memoryIds:   negativeEmotional.map((m) => m.id),
    });
  }

  return patterns.sort((a, b) => b.strength - a.strength);
}

/** Extract a one-line emotional state summary from recent memories. */
export function inferEmotionalState(memories: Memory[]): string | null {
  const recent = memories
    .filter((m) => m.emotional_valence && m.is_active)
    .slice(0, 5);

  if (recent.length === 0) return null;

  const valences = recent.map((m) => m.emotional_valence);
  const dominant = valences.sort(
    (a, b) =>
      valences.filter((v) => v === b).length -
      valences.filter((v) => v === a).length,
  )[0];

  const labels: Record<string, string> = {
    positive: "generally positive and energized",
    negative: "carrying some stress or concern",
    neutral:  "calm and steady",
    mixed:    "mixed — some ups and downs",
  };

  return labels[dominant ?? "neutral"] ?? null;
}
