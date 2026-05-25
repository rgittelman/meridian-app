/**
 * lib/memory/ingest.ts — Memory ingestion pipeline.
 *
 * Flow:
 *   1. Check user memory preferences (opt-out)
 *   2. Extract insights from conversation via AI
 *   3. Safety-filter each candidate
 *   4. Deduplicate against existing memories
 *   5. Persist new memories + generate embeddings
 *   6. Reinforce duplicates instead of creating new rows
 */

import { computeIngestImportance } from "@/lib/cognition/memory-weight";
import { computeMemoryDomains } from "@/lib/domains/retrieve";
import { aiComplete } from "@/lib/ai/service";
import { generateEmbedding } from "@/lib/ai/embeddings";
import { buildMemoryExtractionPrompt } from "@/lib/ai/prompts";
import { AI_CONFIG } from "@/lib/ai/config";
import { MIN_INGEST_CONFIDENCE } from "./constants";
import { findDuplicate, memorySimilarity } from "./dedupe";
import { sanitizeMemoryContent, validateExtractedMemory } from "./safety";
import {
  isMemoryDebugEnabled,
  memoryLog,
  type IngestDebugLog,
} from "./debug";
import {
  getMemoriesForUser,
  insertMemory,
  insertEmbedding,
  reinforceMemory,
  getUserMemoryPreferences,
  isValidCategory,
} from "./db";
import type {
  ExtractedMemory,
  MemoryIngestInput,
  MemoryIngestResult,
  EmotionalValence,
} from "./types";

/** Parse AI JSON response safely. */
function parseExtractedMemories(raw: string): ExtractedMemory[] {
  try {
    const cleaned = raw.replace(/```json\n?|\n?```/g, "").trim();
    const parsed  = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidExtracted);
  } catch {
    return [];
  }
}

function isValidExtracted(item: unknown): item is ExtractedMemory {
  if (!item || typeof item !== "object") return false;
  const m = item as Record<string, unknown>;
  return (
    typeof m.title      === "string" &&
    typeof m.content    === "string" &&
    typeof m.confidence === "number"  &&
    isValidCategory(m.category as string) &&
    m.confidence >= MIN_INGEST_CONFIDENCE
  );
}

/** Main ingestion entry point. Never throws — returns result summary. */
export async function ingestFromConversation(
  input: MemoryIngestInput,
): Promise<MemoryIngestResult> {
  const result: MemoryIngestResult = { created: [], reinforced: [], skipped: 0 };
  const debugLog: IngestDebugLog = {
    extracted_count: 0,
    candidates:      [],
    rejected:          [],
    duplicates:        [],
    created_ids:       [],
    reinforced_ids:    [],
  };

  try {
    const prefs = await getUserMemoryPreferences(input.userId);
    if (!prefs.memory_enabled) {
      if (isMemoryDebugEnabled()) {
        debugLog.rejected.push({ reason: "memory_disabled_by_user" });
        result.debug = debugLog;
        memoryLog("ingest", { status: "skipped", reason: "memory_disabled" });
      }
      return result;
    }

    const conversation = input.messages
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    if (conversation.length < 20) {
      if (isMemoryDebugEnabled()) {
        debugLog.rejected.push({ reason: "conversation_too_short" });
        result.debug = debugLog;
      }
      return result;
    }

    const existing       = await getMemoriesForUser(input.userId, { limit: 100 });
    const existingTitles = existing.map((m) => m.title);

    const prompt = buildMemoryExtractionPrompt(conversation, existingTitles);

    memoryLog("ingest:start", {
      user_id:           input.userId,
      message_count:     input.messages.length,
      existing_memories: existing.length,
    });

    const aiResult = await aiComplete({
      messages:    [{ role: "user", content: prompt }],
      maxTokens:   AI_CONFIG.memoryExtractMaxTokens,
      temperature: 0.2,
    });

    const rawCandidates = parseExtractedMemories(aiResult.content);
    debugLog.extracted_count = rawCandidates.length;

    memoryLog("ingest:extracted", {
      raw_count: rawCandidates.length,
      titles:    rawCandidates.map((c) => c.title),
    });

    if (rawCandidates.length === 0) {
      if (isMemoryDebugEnabled()) {
        debugLog.rejected.push({ reason: "no_insights_above_confidence_threshold" });
        result.debug = debugLog;
      }
      return result;
    }

    for (const candidate of rawCandidates) {
      debugLog.candidates.push({
        title:      candidate.title,
        category:   candidate.category,
        confidence: candidate.confidence,
      });

      if (!isValidCategory(candidate.category)) {
        result.skipped++;
        debugLog.rejected.push({ title: candidate.title, reason: "invalid_category" });
        continue;
      }

      if (candidate.confidence < MIN_INGEST_CONFIDENCE) {
        result.skipped++;
        debugLog.rejected.push({
          title:  candidate.title,
          reason: `confidence_too_low (${candidate.confidence.toFixed(2)})`,
        });
        continue;
      }

      if (!validateExtractedMemory(candidate)) {
        result.skipped++;
        debugLog.rejected.push({ title: candidate.title, reason: "safety_filter_blocked" });
        memoryLog("ingest:rejected", { title: candidate.title, reason: "safety_filter" });
        continue;
      }

      const safeContent = sanitizeMemoryContent(candidate.content);
      const safeTitle   = sanitizeMemoryContent(candidate.title);
      if (!safeContent || !safeTitle) {
        result.skipped++;
        debugLog.rejected.push({ title: candidate.title, reason: "content_unsafe_after_sanitize" });
        continue;
      }

      if (prefs.disabled_memory_categories.includes(candidate.category)) {
        result.skipped++;
        debugLog.rejected.push({ title: candidate.title, reason: `category_disabled (${candidate.category})` });
        continue;
      }

      const duplicate = findDuplicate(candidate, existing);
      if (duplicate) {
        const similarity = memorySimilarity(candidate, duplicate);
        await reinforceMemory(duplicate.id, input.userId);
        result.reinforced.push(duplicate);
        debugLog.reinforced_ids.push(duplicate.id);
        debugLog.duplicates.push({
          title:          candidate.title,
          existing_id:    duplicate.id,
          existing_title: duplicate.title,
        });
        memoryLog("ingest:duplicate", {
          candidate:  candidate.title,
          existing:   duplicate.title,
          similarity: +similarity.toFixed(3),
          action:     "reinforced",
        });
        continue;
      }

      const domains = computeMemoryDomains({
        category:            candidate.category,
        title:               safeTitle,
        content:             safeContent,
        emotional_intensity: candidate.emotional_intensity,
        emotional_valence:   candidate.emotional_valence,
      });

      const memory = await insertMemory(input.userId, {
        category:            candidate.category,
        title:               safeTitle,
        content:             safeContent,
        summary:             candidate.summary ?? safeContent.slice(0, 120),
        confidence:          candidate.confidence,
        importance:          computeIngestImportance(candidate),
        emotional_valence:   (candidate.emotional_valence ?? "neutral") as EmotionalValence,
        emotional_intensity: candidate.emotional_intensity ?? 0,
        source_type:         input.sourceType ?? "conversation",
        source_id:           input.sourceId ?? null,
        source_excerpt:      candidate.source_excerpt ?? conversation.slice(0, 300),
        why_remembered:      candidate.why_remembered ?? "Mentioned in conversation.",
        metadata:            { domains_explain: domains },
        domains,
        reinforcement_count: 1,
        last_reinforced_at:  new Date().toISOString(),
        is_active:           true,
      });

      if (!memory) {
        result.skipped++;
        debugLog.rejected.push({ title: candidate.title, reason: "db_insert_failed" });
        continue;
      }

      const embedding = await generateEmbedding(`${safeTitle} ${safeContent}`);
      if (embedding) {
        await insertEmbedding(input.userId, memory.id, embedding, aiResult.model);
      } else if (isMemoryDebugEnabled()) {
        memoryLog("ingest:embedding_skipped", { memory_id: memory.id, title: safeTitle });
      }

      result.created.push(memory);
      debugLog.created_ids.push(memory.id);
      existing.push(memory);

      memoryLog("ingest:created", {
        id:         memory.id,
        title:      memory.title,
        category:   memory.category,
        confidence: memory.confidence,
        importance: memory.importance,
      });
    }

    memoryLog("ingest:complete", {
      created:    result.created.length,
      reinforced: result.reinforced.length,
      skipped:    result.skipped,
    });
  } catch (err) {
    console.error("[memory/ingest] error:", err instanceof Error ? err.message : err);
    debugLog.rejected.push({ reason: `pipeline_error: ${err instanceof Error ? err.message : "unknown"}` });
  }

  if (isMemoryDebugEnabled()) {
    result.debug = debugLog;
  }

  return result;
}
