/**
 * lib/tasks/ingest.ts — Task extraction pipeline (async-safe, never throws).
 */

import { extractTasksFromMessages } from "./extract";
import { persistExtractedTasks } from "./db";
import type { TaskExtractionResult, TaskIngestInput } from "./types";

export async function ingestTasksFromConversation(
  input: TaskIngestInput,
): Promise<TaskExtractionResult> {
  const result: TaskExtractionResult = { created: [], skipped: 0, extracted: [] };

  try {
    const extracted = extractTasksFromMessages(input.messages);
    result.extracted = extracted;

    if (extracted.length === 0) return result;

    const created = await persistExtractedTasks(input.userId, extracted, {
      conversationId: input.conversationId,
      memoryId:       input.memoryIds?.[0],
      minConfidence:  0.6,
    });

    result.created = created;
    result.skipped = extracted.length - created.length;
  } catch (err) {
    console.error("[tasks/ingest] error:", err instanceof Error ? err.message : err);
  }

  return result;
}
