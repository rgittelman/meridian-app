/**
 * lib/reminders/db.ts — Reminder persistence.
 */

import { createClient } from "@/lib/supabase/server";
import type { Reminder, ReminderStatus, ReminderCandidate } from "./types";
import type { LifeDomain } from "@/lib/domains/types";

export async function getRemindersForUser(
  userId: string,
  options: {
    status?: ReminderStatus | ReminderStatus[];
    limit?:  number;
  } = {},
): Promise<Reminder[]> {
  const supabase = await createClient();
  let query = supabase
    .from("reminders")
    .select("*")
    .eq("user_id", userId)
    .order("scheduled_for", { ascending: true, nullsFirst: false });

  const statuses = options.status
    ? (Array.isArray(options.status) ? options.status : [options.status])
    : ["pending"];
  query = query.in("status", statuses);
  if (options.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) {
    console.error("[reminders/db] getRemindersForUser:", error.message);
    return [];
  }
  return (data ?? []) as Reminder[];
}

export async function insertReminder(
  userId: string,
  reminder: Omit<Reminder, "id" | "user_id" | "created_at" | "updated_at">,
): Promise<Reminder | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reminders")
    .insert({ ...reminder, user_id: userId })
    .select()
    .single();

  if (error) {
    console.error("[reminders/db] insertReminder:", error.message);
    return null;
  }
  return data as Reminder;
}

export async function updateReminderStatus(
  userId:     string,
  reminderId: string,
  status:     ReminderStatus,
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("reminders")
    .update({ status })
    .eq("id", reminderId)
    .eq("user_id", userId);

  return !error;
}

export async function findExistingReminder(
  userId: string,
  match:  { task_id?: string; memory_id?: string; title?: string },
): Promise<Reminder | null> {
  const supabase = await createClient();
  let query = supabase
    .from("reminders")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "pending");

  if (match.task_id)   query = query.eq("task_id", match.task_id);
  if (match.memory_id) query = query.eq("memory_id", match.memory_id);
  if (match.title)     query = query.eq("title", match.title);

  const { data } = await query.limit(1).maybeSingle();
  return (data as Reminder) ?? null;
}

export async function persistReminderCandidates(
  userId:      string,
  candidates:  ReminderCandidate[],
): Promise<Reminder[]> {
  const created: Reminder[] = [];

  for (const c of candidates) {
    const existing = await findExistingReminder(userId, {
      task_id:   c.task_id,
      memory_id: c.memory_id,
      title:     c.title,
    });
    if (existing) continue;

    const reminder = await insertReminder(userId, {
      title:          c.title,
      body:           c.body ?? null,
      reminder_type:  c.reminder_type,
      status:         "pending",
      task_id:        c.task_id ?? null,
      memory_id:      c.memory_id ?? null,
      scheduled_for:  c.scheduled_for ?? null,
      scheduled_date: null,
      recurrence:     null,
      why_shown:      c.why_shown,
      gentle:         true,
      domains:        (c.domains ?? []) as LifeDomain[],
      metadata:       {},
    });

    if (reminder) created.push(reminder);
  }

  return created;
}
