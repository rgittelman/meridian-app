/**
 * lib/os/loop.ts — Memory → pattern → task → reminder → reflection loop.
 *
 * Core operating-system loop. Runs async after conversation ingest.
 * Never throws — failures are logged and skipped.
 */

import { getMemoriesForUser, updateMemoryDomains } from "@/lib/memory/db";
import { computeMemoryDomains } from "@/lib/domains/retrieve";
import { ingestTasksFromConversation } from "@/lib/tasks/ingest";
import { getTasksForUser } from "@/lib/tasks/db";
import { generateReminders } from "@/lib/reminders/engine";
import { detectProactiveSignals } from "@/lib/proactive/engine";
import { synthesizePatterns } from "@/lib/cognition/pattern-synthesis";
import type { Memory } from "@/lib/memory/types";

export interface OSLoopInput {
  userId:          string;
  messages:        { role: "user" | "assistant"; content: string }[];
  conversationId?: string;
  newMemories?:    Memory[];
  reinforcedMemories?: Memory[];
}

export interface OSLoopResult {
  tasksCreated:      number;
  remindersCreated:  number;
  domainsUpdated:    number;
  proactiveSignals:  number;
}

/** Tag memories with domains and run the full OS loop. */
export async function runOSLoop(input: OSLoopInput): Promise<OSLoopResult> {
  const result: OSLoopResult = {
    tasksCreated:     0,
    remindersCreated: 0,
    domainsUpdated:   0,
    proactiveSignals: 0,
  };

  try {
    const touched = [...(input.newMemories ?? []), ...(input.reinforcedMemories ?? [])];

    for (const memory of touched) {
      const domains = computeMemoryDomains({
        category:            memory.category,
        title:               memory.title,
        content:             memory.content,
        emotional_intensity: memory.emotional_intensity,
        emotional_valence:   memory.emotional_valence,
      });
      if (domains.length > 0) {
        const ok = await updateMemoryDomains(input.userId, memory.id, domains);
        if (ok) result.domainsUpdated++;
        memory.domains = domains;
      }
    }

    const taskResult = await ingestTasksFromConversation({
      userId:         input.userId,
      messages:       input.messages,
      conversationId: input.conversationId,
      memoryIds:      input.newMemories?.map((m) => m.id),
    });
    result.tasksCreated = taskResult.created.length;

    const [memories, tasks] = await Promise.all([
      getMemoriesForUser(input.userId, { limit: 50 }),
      getTasksForUser(input.userId, { status: ["open", "snoozed"], limit: 30 }),
    ]);

    const patterns = synthesizePatterns(memories, 3).map((p) => p.label);
    const reminderResult = await generateReminders(input.userId, {
      tasks:    tasks,
      memories: memories.slice(0, 20),
      patterns,
    });
    result.remindersCreated = reminderResult.created;

    const proactive = detectProactiveSignals({ memories, tasks });
    result.proactiveSignals = proactive.signals.length;
  } catch (err) {
    console.error("[os/loop] error:", err instanceof Error ? err.message : err);
  }

  return result;
}
