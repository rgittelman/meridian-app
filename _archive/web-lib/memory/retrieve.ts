/**
 * lib/memory/retrieve.ts — Memory retrieval pipeline.
 *
 * Combines three retrieval strategies for chat:
 *   1. Semantic — query-relevant memories via embedding/text similarity
 *   2. Recent   — memories reinforced in the last 7 days
 *   3. Important — high-importance memories (>= 0.65)
 *
 * Results are merged, deduplicated by id, re-ranked, and capped.
 */

import { generateEmbedding, batchCosineSimilarity, textSimilarity } from "@/lib/ai/embeddings";
import { AI_CONFIG } from "@/lib/ai/config";
import { rankMemories, filterByScore } from "./rank";
import {
  getMemoriesForUser,
  getEmbeddingsForUser,
  getUserMemoryPreferences,
} from "./db";
import {
  isMemoryDebugEnabled,
  memoryLog,
  type RetrievalDebugLog,
} from "./debug";
import type { Memory, MemoryRetrievalOptions, RankedMemory } from "./types";

// ── Core retrieval ────────────────────────────────────────────────────────────

async function computeSemanticScores(
  userId:   string,
  memories: Memory[],
  query:    string,
): Promise<Map<string, number>> {
  const semanticScores = new Map<string, number>();
  const queryEmbedding = await generateEmbedding(query);

  if (queryEmbedding) {
    const embeddings   = await getEmbeddingsForUser(userId);
    const embeddingMap = new Map(embeddings.map((e) => [e.memory_id, e.embedding]));

    for (const memory of memories) {
      const memEmbedding = embeddingMap.get(memory.id);
      if (memEmbedding) {
        const [sim] = batchCosineSimilarity(queryEmbedding, [memEmbedding]);
        semanticScores.set(memory.id, sim);
      } else {
        semanticScores.set(
          memory.id,
          textSimilarity(query, `${memory.title} ${memory.content}`),
        );
      }
    }
  } else {
    for (const memory of memories) {
      semanticScores.set(
        memory.id,
        textSimilarity(query, `${memory.title} ${memory.content}`),
      );
    }
  }

  return semanticScores;
}

async function fetchFilteredMemories(
  userId: string,
  options: MemoryRetrievalOptions = {},
): Promise<Memory[]> {
  const {
    categories,
    minConfidence  = 0.4,
    excludeCategories = [],
  } = options;

  const prefs = await getUserMemoryPreferences(userId);
  if (!prefs.memory_enabled) return [];

  const disabledSet = new Set([
    ...prefs.disabled_memory_categories,
    ...excludeCategories,
  ]);

  let memories = await getMemoriesForUser(userId, {
    categories,
    activeOnly: true,
    limit:      200,
  });

  return memories.filter(
    (m) => m.confidence >= minConfidence && !disabledSet.has(m.category),
  );
}

export async function retrieveMemories(
  userId:  string,
  options: MemoryRetrievalOptions = {},
): Promise<RankedMemory[]> {
  const { query, limit = 10, minConfidence = 0.4 } = options;

  const memories = await fetchFilteredMemories(userId, { ...options, minConfidence });
  if (memories.length === 0) return [];

  let semanticScores: Map<string, number> | undefined;

  if (query) {
    semanticScores = await computeSemanticScores(userId, memories, query);
  }

  const ranked   = rankMemories(memories, semanticScores);
  const filtered = filterByScore(ranked, query ? 0.25 : 0.2);

  return filtered.slice(0, limit);
}

// ── Strategy: recent memories ─────────────────────────────────────────────────

async function retrieveRecentMemories(
  userId: string,
  limit:  number,
): Promise<RankedMemory[]> {
  const memories = await fetchFilteredMemories(userId, { minConfidence: 0.4 });
  const sevenDaysAgo = Date.now() - 7 * 86_400_000;

  const recent = memories
    .filter((m) => new Date(m.last_reinforced_at).getTime() > sevenDaysAgo)
    .sort(
      (a, b) =>
        new Date(b.last_reinforced_at).getTime() -
        new Date(a.last_reinforced_at).getTime(),
    )
    .slice(0, limit);

  return rankMemories(recent);
}

// ── Strategy: high-importance memories ────────────────────────────────────────

async function retrieveHighImportanceMemories(
  userId:      string,
  limit:       number,
  minImportance = 0.65,
): Promise<RankedMemory[]> {
  const memories = await fetchFilteredMemories(userId, { minConfidence: 0.45 });
  const important = memories
    .filter((m) => m.importance >= minImportance)
    .sort((a, b) => b.importance - a.importance)
    .slice(0, limit);

  return rankMemories(important);
}

// ── Merge helper ──────────────────────────────────────────────────────────────

function mergeRankedPools(...pools: RankedMemory[][]): RankedMemory[] {
  const merged = new Map<string, RankedMemory>();

  for (const pool of pools) {
    for (const memory of pool) {
      const existing = merged.get(memory.id);
      if (!existing || memory.score > existing.score) {
        merged.set(memory.id, memory);
      }
    }
  }

  return Array.from(merged.values()).sort((a, b) => b.score - a.score);
}

// ── Chat retrieval (multi-strategy) ───────────────────────────────────────────

/** Primary retrieval for chat — merges semantic, recent, and important pools. */
export async function retrieveForChat(
  userId: string,
  query?: string,
): Promise<{ memories: RankedMemory[]; debug?: RetrievalDebugLog }> {
  const max = AI_CONFIG.maxMemoriesInPrompt;

  const [semantic, recent, important] = await Promise.all([
    retrieveMemories(userId, { query, limit: 5, minConfidence: 0.45 }),
    retrieveRecentMemories(userId, 3),
    retrieveHighImportanceMemories(userId, 3),
  ]);

  const merged = mergeRankedPools(semantic, recent, important).slice(0, max);

  let debug: RetrievalDebugLog | undefined;

  if (isMemoryDebugEnabled()) {
    debug = {
      query:         query ?? null,
      semantic_ids:  semantic.map((m) => m.id),
      recent_ids:    recent.map((m) => m.id),
      important_ids: important.map((m) => m.id),
      merged_ids:    merged.map((m) => m.id),
      scores: merged.map((m) => ({
        id:        m.id,
        title:     m.title,
        score:     +m.score.toFixed(3),
        breakdown: {
          semantic:      +m.score_breakdown.semantic.toFixed(3),
          recency:       +m.score_breakdown.recency.toFixed(3),
          importance:    +m.score_breakdown.importance.toFixed(3),
          confidence:    +m.score_breakdown.confidence.toFixed(3),
          reinforcement: +m.score_breakdown.reinforcement.toFixed(3),
        },
      })),
    };

    memoryLog("retrieval", debug as unknown as Record<string, unknown>);
  }

  return { memories: merged, debug };
}

/** @deprecated Use retrieveForChat — kept for backward compatibility */
export async function retrieveContextMemories(
  userId: string,
  query?: string,
): Promise<RankedMemory[]> {
  const { memories } = await retrieveForChat(userId, query);
  return memories;
}

/** Simulate retrieval for dev test panel — returns full debug payload. */
export async function simulateRetrieval(
  userId: string,
  query?: string,
): Promise<{ memories: RankedMemory[]; debug: RetrievalDebugLog }> {
  const result = await retrieveForChat(userId, query);
  return {
    memories: result.memories,
    debug:    result.debug ?? {
      query: query ?? null,
      semantic_ids: [], recent_ids: [], important_ids: [],
      merged_ids: result.memories.map((m) => m.id),
      scores: result.memories.map((m) => ({
        id: m.id, title: m.title, score: +m.score.toFixed(3),
        breakdown: { ...m.score_breakdown },
      })),
    },
  };
}
