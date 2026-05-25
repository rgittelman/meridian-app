/**
 * lib/cognition/trust.ts — Memory influence metadata for transparency.
 */

import type { RankedMemory } from "@/lib/memory/types";
import type { RetrievalDebugLog } from "@/lib/memory/debug";
import type { MemoryInfluence } from "./types";

/** Build influence metadata explaining why each memory was retrieved. */
export function buildMemoryInfluence(
  memories: RankedMemory[],
  retrievalDebug?: RetrievalDebugLog,
): MemoryInfluence[] {
  const semanticSet = new Set(retrievalDebug?.semantic_ids ?? []);
  const recentSet   = new Set(retrievalDebug?.recent_ids ?? []);
  const importantSet = new Set(retrievalDebug?.important_ids ?? []);

  return memories.map((m) => {
    let reason: MemoryInfluence["reason"] = "semantic";
    if (importantSet.has(m.id) && !semanticSet.has(m.id)) reason = "importance";
    else if (recentSet.has(m.id) && !semanticSet.has(m.id))   reason = "recent";
    else if (semanticSet.has(m.id))                           reason = "semantic";

    return {
      memoryId:      m.id,
      title:         m.title,
      category:      m.category,
      reason,
      whyRemembered: m.why_remembered,
    };
  });
}
