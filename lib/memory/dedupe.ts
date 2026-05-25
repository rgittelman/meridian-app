/**
 * lib/memory/dedupe.ts — Duplicate memory detection.
 *
 * Uses Jaccard text similarity as primary signal, with category
 * matching as a secondary filter. Embedding similarity is applied
 * in the retrieval layer when vectors are available.
 */

import { DEDUPE_SIMILARITY_THRESHOLD } from "./constants";
import { textSimilarity } from "@/lib/ai/embeddings";
import type { ExtractedMemory, Memory } from "./types";

/** Check if an extracted memory is a duplicate of any existing memory. */
export function findDuplicate(
  candidate: ExtractedMemory,
  existing:  Memory[],
): Memory | null {
  const sameCategory = existing.filter(
    (m) => m.category === candidate.category && m.is_active,
  );

  for (const memory of sameCategory) {
    const titleSim   = textSimilarity(candidate.title, memory.title);
    const contentSim = textSimilarity(candidate.content, memory.content);
    const combined   = titleSim * 0.4 + contentSim * 0.6;

    if (combined >= DEDUPE_SIMILARITY_THRESHOLD) {
      return memory;
    }

    // Repeated concern with varied wording — reinforce instead of duplicate
    if (contentSim >= 0.55 && combined >= 0.48) {
      return memory;
    }
  }

  // Cross-category title match (very similar title = likely duplicate)
  for (const memory of existing) {
    if (!memory.is_active) continue;
    if (textSimilarity(candidate.title, memory.title) >= 0.85) {
      return memory;
    }
  }

  return null;
}

/** Score how similar two memories are (0–1). */
export function memorySimilarity(a: Memory | ExtractedMemory, b: Memory): number {
  const titleSim   = textSimilarity(a.title, b.title);
  const contentSim = textSimilarity(a.content, b.content);
  return titleSim * 0.4 + contentSim * 0.6;
}
