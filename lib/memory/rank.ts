/**
 * lib/memory/rank.ts — Contextual memory ranking.
 *
 * Combines semantic similarity, recency, importance, confidence,
 * and reinforcement into a single retrieval score.
 *
 * Score formula (weights sum to 1.0):
 *   semantic      × 0.35
 *   recency       × 0.20
 *   importance    × 0.20
 *   confidence    × 0.15
 *   reinforcement × 0.10
 */

import { computeEffectiveImportance } from "@/lib/cognition/memory-weight";
import type { Memory, RankedMemory, MemoryScoreBreakdown } from "./types";

const WEIGHTS = {
  semantic:      0.35,
  recency:       0.20,
  importance:    0.20,
  confidence:    0.15,
  reinforcement: 0.10,
} as const;

/** Recency score: 1.0 for today, decays over 90 days. */
function recencyScore(lastReinforcedAt: string): number {
  const daysSince = (Date.now() - new Date(lastReinforcedAt).getTime()) / 86_400_000;
  return Math.max(0, 1 - daysSince / 90);
}

/** Reinforcement score: log-scaled count, caps at 1.0 around 10 reinforcements. */
function reinforcementScore(count: number): number {
  return Math.min(1, Math.log10(count + 1) / Math.log10(11));
}

/** Rank memories by combined score. Returns sorted descending. */
export function rankMemories(
  memories:        Memory[],
  semanticScores?: Map<string, number>,
): RankedMemory[] {
  return memories
    .map((memory): RankedMemory => {
      const breakdown: MemoryScoreBreakdown = {
        semantic:      semanticScores?.get(memory.id) ?? 0.5,
        recency:       recencyScore(memory.last_reinforced_at),
        importance:    computeEffectiveImportance(memory),
        confidence:    memory.confidence,
        reinforcement: reinforcementScore(memory.reinforcement_count),
      };

      const score =
        breakdown.semantic      * WEIGHTS.semantic      +
        breakdown.recency       * WEIGHTS.recency       +
        breakdown.importance    * WEIGHTS.importance    +
        breakdown.confidence    * WEIGHTS.confidence    +
        breakdown.reinforcement * WEIGHTS.reinforcement;

      return { ...memory, score, score_breakdown: breakdown };
    })
    .sort((a, b) => b.score - a.score);
}

/** Filter ranked memories by minimum score threshold. */
export function filterByScore(
  ranked: RankedMemory[],
  minScore = 0.3,
): RankedMemory[] {
  return ranked.filter((m) => m.score >= minScore);
}
