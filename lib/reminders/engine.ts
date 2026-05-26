/**
 * lib/reminders/engine.ts — Calm reminder generation engine.
 *
 * Creates gentle, contextual reminders — never aggressive nudges.
 * Reminders are stored as pending; delivery UX comes later.
 */

import type { Memory } from "@/lib/memory/types";
import type { Task } from "@/lib/tasks/types";
import type { ReminderCandidate } from "./types";
import { persistReminderCandidates } from "./db";

function tomorrowMorning(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(8, 0, 0, 0);
  return d.toISOString();
}

/** Build reminder candidates from tasks, memories, and patterns. */
export function buildReminderCandidates(input: {
  tasks:     Task[];
  memories:  Memory[];
  patterns?: string[];
}): ReminderCandidate[] {
  const candidates: ReminderCandidate[] = [];
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  // Task-based reminders
  for (const task of input.tasks.filter((t) => t.status === "open")) {
    if (task.due_date === today || task.due_date === tomorrowStr) {
      // Use the task's actual due time, not current time
      let scheduled: string;
      if (task.due_date === tomorrowStr) {
        scheduled = tomorrowMorning();
      } else if (task.due_at) {
        scheduled = task.due_at;
      } else {
        scheduled = new Date().toISOString();
      }

      const meta = (task.metadata ?? {}) as Record<string, unknown>;
      candidates.push({
        title:         task.title,
        body:          task.due_date === tomorrowStr
          ? "On your list for tomorrow."
          : "Due today.",
        reminder_type: "task",
        task_id:       task.id,
        scheduled_for: scheduled,
        why_shown:     `You mentioned: "${task.title.slice(0, 60)}"`,
        domains:       task.domains,
        display_time:  typeof meta.display_time === "string" ? meta.display_time : undefined,
        display_date:  typeof meta.display_date === "string" ? meta.display_date : undefined,
      });
    }

    if (task.postpone_count >= 3) {
      candidates.push({
        title:         task.title,
        body:          "This has been postponed a few times — still relevant?",
        reminder_type: "contextual",
        task_id:       task.id,
        why_shown:     `Postponed ${task.postpone_count} times`,
        domains:       task.domains,
      });
    }
  }

  // Memory-based contextual reminders (calm mornings, routines)
  for (const memory of input.memories) {
    const text = `${memory.title} ${memory.content}`.toLowerCase();

    if (/\b(calm|calmer|chaotic)\b.*\bmorning/i.test(text) || /\bmorning.*\b(overwhelm|chaos)/i.test(text)) {
      candidates.push({
        title:         "Calmer morning tomorrow?",
        body:          "Fewer context switches early tends to help.",
        reminder_type: "contextual",
        memory_id:     memory.id,
        scheduled_for: tomorrowMorning(),
        why_shown:     "Based on your morning patterns",
        domains:       (memory.domains ?? ["routines"]) as ReminderCandidate["domains"],
      });
    }

    if (memory.category === "unfinished_tasks" && memory.reinforcement_count >= 2) {
      candidates.push({
        title:         memory.title,
        body:          "Still on your mind?",
        reminder_type: "contextual",
        memory_id:     memory.id,
        why_shown:     "Recurring open loop",
        domains:       (memory.domains ?? ["productivity"]) as ReminderCandidate["domains"],
      });
    }
  }

  // Reflection prompt (at most one)
  if (input.patterns?.length) {
    candidates.push({
      title:         "Quick reflection",
      body:          `A theme lately: ${input.patterns[0]}. Worth a minute tonight?`,
      reminder_type: "reflection",
      why_shown:     "Recurring theme detected",
      domains:       ["emotional", "life"],
    });
  }

  return candidates.slice(0, 6);
}

/** Generate and persist calm reminders. Never throws. */
export async function generateReminders(
  userId: string,
  input: {
    tasks:     Task[];
    memories:  Memory[];
    patterns?: string[];
  },
): Promise<{ created: number }> {
  try {
    const candidates = buildReminderCandidates(input);
    const created = await persistReminderCandidates(userId, candidates);
    return { created: created.length };
  } catch (err) {
    console.error("[reminders/engine] error:", err instanceof Error ? err.message : err);
    return { created: 0 };
  }
}
