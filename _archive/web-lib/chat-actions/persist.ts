/**
 * lib/chat-actions/persist.ts — Persist chat-extracted actions to DB.
 *
 * Handles deduplication, quality gating, and returns structured results
 * so the frontend can show accurate confirmations.
 */

import type { ChatActionCompat } from "./extract";
import { normalizeForDedup } from "./extract";

type ChatAction = ChatActionCompat;
import { findExistingReminder, insertReminder } from "@/lib/reminders/db";
import { createClient } from "@/lib/supabase/server";
import type { LifeDomain } from "@/lib/domains/types";

export interface PersistResult {
  persisted:  boolean;
  id:         string | null;
  type:       "task" | "reminder" | "event";
  title:      string;
  date:       string | null;
  time:       string | null;
  reason:     string;
}

export async function persistChatAction(
  userId: string,
  action: ChatAction,
): Promise<PersistResult> {
  const intent = action.intent ?? action.type;
  const fail = (reason: string): PersistResult => ({
    persisted: false, id: null,
    type: (intent === "reminder" ? "reminder" : intent === "event" ? "event" : "task"),
    title: action.title,
    date: action.date, time: action.time,
    reason,
  });

  if (action.confidence < 0.5) {
    console.log("[chat-actions/persist] skipped: low confidence", action.confidence);
    return fail("low_confidence");
  }

  if (intent === "reminder") {
    return persistReminder(userId, action);
  }

  if (intent === "event" || intent === "task") {
    return persistTask(userId, action);
  }

  return fail("not_actionable");
}

async function persistReminder(
  userId: string,
  action: ChatAction,
): Promise<PersistResult> {
  const fail = (reason: string): PersistResult => ({
    persisted: false, id: null,
    type: "reminder", title: action.title,
    date: action.date, time: action.time,
    reason,
  });

  // Dedup: check by normalized title
  const existing = await findExistingReminder(userId, { title: action.title });
  if (existing) {
    const existingNorm = normalizeForDedup(existing.title);
    const newNorm = normalizeForDedup(action.title);
    if (existingNorm === newNorm) {
      console.log("[chat-actions/persist] duplicate reminder:", action.title);
      return {
        persisted: true, id: existing.id,
        type: "reminder", title: existing.title,
        date: action.date, time: action.time,
        reason: "duplicate_existing",
      };
    }
  }

  // Also check broader fuzzy match
  const supabase = await createClient();
  const { data: pendingReminders } = await supabase
    .from("reminders")
    .select("id, title")
    .eq("user_id", userId)
    .eq("status", "pending")
    .limit(20);

  if (pendingReminders) {
    const newNorm = normalizeForDedup(action.title);
    for (const r of pendingReminders) {
      const rNorm = normalizeForDedup(r.title);
      if (rNorm === newNorm || rNorm.includes(newNorm) || newNorm.includes(rNorm)) {
        console.log("[chat-actions/persist] fuzzy duplicate reminder:", action.title, "matches", r.title);
        return {
          persisted: true, id: r.id,
          type: "reminder", title: r.title,
          date: action.date, time: action.time,
          reason: "duplicate_fuzzy",
        };
      }
    }
  }

  const metadata: Record<string, unknown> = {
    source: "chat",
    source_text: action.source_text.slice(0, 200),
  };
  if (action.time) metadata.display_time = action.time;
  if (action.date) metadata.display_date = action.date;

  const reminder = await insertReminder(userId, {
    title:          action.title,
    body:           action.body,
    reminder_type:  "manual",
    status:         "pending",
    task_id:        null,
    memory_id:      null,
    scheduled_for:  action.scheduled_for,
    scheduled_date: action.date,
    recurrence:     null,
    why_shown:      "You asked for this reminder",
    gentle:         true,
    domains:        [] as LifeDomain[],
    metadata,
  });

  if (!reminder) {
    console.error("[chat-actions/persist] insertReminder failed for:", action.title);
    return fail("db_error");
  }

  console.log("[chat-actions/persist] reminder created:", {
    id: reminder.id,
    title: reminder.title,
    scheduled_for: reminder.scheduled_for,
    scheduled_date: reminder.scheduled_date,
    metadata_display_time: (reminder.metadata as Record<string, unknown>)?.display_time ?? "NOT SET",
    metadata_display_date: (reminder.metadata as Record<string, unknown>)?.display_date ?? "NOT SET",
    created_at: reminder.created_at,
  });
  return {
    persisted: true, id: reminder.id,
    type: "reminder", title: reminder.title,
    date: action.date, time: action.time,
    reason: "created",
  };
}

async function persistTask(
  userId: string,
  action: ChatAction,
): Promise<PersistResult> {
  const actionType = (action.intent ?? action.type) === "event" ? "event" as const : "task" as const;
  const fail = (reason: string): PersistResult => ({
    persisted: false, id: null,
    type: actionType, title: action.title,
    date: action.date, time: action.time,
    reason,
  });

  const supabase = await createClient();

  // Dedup: check existing open tasks
  const { data: openTasks } = await supabase
    .from("tasks")
    .select("id, title")
    .eq("user_id", userId)
    .eq("status", "open")
    .limit(30);

  if (openTasks) {
    const newNorm = normalizeForDedup(action.title);
    for (const t of openTasks) {
      const tNorm = normalizeForDedup(t.title);
      if (tNorm === newNorm || tNorm.includes(newNorm) || newNorm.includes(tNorm)) {
        console.log("[chat-actions/persist] duplicate task:", action.title, "matches", t.title);
        return {
          persisted: true, id: t.id,
          type: actionType, title: t.title,
          date: action.date, time: action.time,
          reason: "duplicate_existing",
        };
      }
    }
  }

  const taskMeta: Record<string, unknown> = {
    source: "chat",
    source_text: action.source_text.slice(0, 200),
  };
  if (action.time) taskMeta.display_time = action.time;
  if (action.date) taskMeta.display_date = action.date;

  // due_at uses the naive local-time string (no Z) so sorting is reasonable
  const due_at = action.date && action.time
    ? `${action.date}T${action.time}:00`
    : null;

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id:     userId,
      title:       action.title,
      task_type:   action.type === "event" ? "event" : "hard",
      status:      "open",
      confidence:  action.confidence,
      due_date:    action.date,
      due_at,
      source_type: "conversation",
      domains:     [],
      metadata:    taskMeta,
    })
    .select("id, title")
    .single();

  if (error || !data) {
    console.error("[chat-actions/persist] task insert failed:", error?.message);
    return fail("db_error");
  }

  console.log("[chat-actions/persist] task created:", { id: data.id, title: data.title });
  return {
    persisted: true, id: data.id,
    type: actionType, title: data.title,
    date: action.date, time: action.time,
    reason: "created",
  };
}
