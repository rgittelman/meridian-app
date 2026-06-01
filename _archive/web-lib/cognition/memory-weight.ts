/**
 * lib/cognition/memory-weight.ts — Dynamic memory importance scoring.
 *
 * Strengthens high-signal memories, weakens shallow one-offs.
 * Used by ranking (retrieval) and ingestion (persistence).
 */

import type { Memory } from "@/lib/memory/types";
import type { ExtractedMemory, MemoryCategory } from "@/lib/memory/types";

const HIGH_SIGNAL: ReadonlySet<MemoryCategory> = new Set([
  "recurring_goals",
  "priorities",
  "recurring_stressors",
  "emotional_patterns",
  "unfinished_tasks",
]);

const LOW_SIGNAL: ReadonlySet<MemoryCategory> = new Set([
  "preferences",
]);

function clamp(n: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, n));
}

/** Effective importance for retrieval ranking. */
export function computeEffectiveImportance(memory: Memory): number {
  let imp = memory.importance;

  // Strengthen
  if (memory.emotional_intensity >= 0.55)     imp += 0.12;
  if (memory.reinforcement_count >= 3)        imp += 0.08 + Math.min(0.12, memory.reinforcement_count * 0.02);
  if (HIGH_SIGNAL.has(memory.category))       imp += 0.10;
  if (memory.confidence >= 0.75)              imp += 0.05;

  // Weaken
  if (LOW_SIGNAL.has(memory.category) && memory.reinforcement_count < 2) {
    imp -= 0.18;
  }
  if (memory.confidence < 0.55)               imp -= 0.12;
  if (memory.importance < 0.45 && memory.reinforcement_count === 1) {
    imp -= 0.10; // one-off shallow
  }

  return clamp(imp);
}

/** Importance assigned at ingestion time. */
export function computeIngestImportance(candidate: ExtractedMemory): number {
  let imp = candidate.importance ?? candidate.confidence;

  if (candidate.emotional_intensity && candidate.emotional_intensity >= 0.5) {
    imp += 0.12;
  }
  if (HIGH_SIGNAL.has(candidate.category)) {
    imp += 0.15;
  }
  if (candidate.emotional_valence === "negative" && (candidate.emotional_intensity ?? 0) >= 0.4) {
    imp += 0.08;
  }
  if (LOW_SIGNAL.has(candidate.category)) {
    imp -= 0.05;
  }
  if (candidate.confidence < 0.65) {
    imp -= 0.08;
  }

  return clamp(imp, 0.35, 1);
}

/** Importance bump when a memory is reinforced (user repeated concern). */
export function reinforcementImportanceBump(
  currentImportance: number,
  emotionalIntensity: number,
): number {
  let bump = 0.05;
  if (emotionalIntensity >= 0.5) bump += 0.04;
  return clamp(currentImportance + bump);
}
