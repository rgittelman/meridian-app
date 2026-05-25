/**
 * lib/tasks/db.ts — Task persistence.
 */

import { createClient } from "@/lib/supabase/server";
import type { Task, TaskStatus, ExtractedTask } from "./types";
import type { LifeDomain } from "@/lib/domains/types";

export async function getTasksForUser(
  userId: string,
  options: {
    status?:   TaskStatus | TaskStatus[];
    limit?:    number;
    dueBefore?: string;
  } = {},
): Promise<Task[]> {
  const supabase = await createClient();
  let query = supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (options.status) {
    const statuses = Array.isArray(options.status) ? options.status : [options.status];
    query = query.in("status", statuses);
  }
  if (options.dueBefore) query = query.lte("due_date", options.dueBefore);
  if (options.limit)     query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) {
    console.error("[tasks/db] getTasksForUser:", error.message);
    return [];
  }
  return (data ?? []) as Task[];
}

export async function insertTask(
  userId: string,
  task: Omit<Task, "id" | "user_id" | "created_at" | "updated_at">,
): Promise<Task | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...task, user_id: userId })
    .select()
    .single();

  if (error) {
    console.error("[tasks/db] insertTask:", error.message);
    return null;
  }
  return data as Task;
}

export async function updateTaskStatus(
  userId:   string,
  taskId:   string,
  status:   TaskStatus,
  extra?:   Partial<Pick<Task, "postpone_count">>,
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ status, ...extra })
    .eq("id", taskId)
    .eq("user_id", userId);

  return !error;
}

export async function findSimilarOpenTask(
  userId: string,
  title:  string,
): Promise<Task | null> {
  const tasks = await getTasksForUser(userId, { status: "open", limit: 50 });
  const norm = title.toLowerCase().replace(/[^\w\s]/g, "").trim();
  return tasks.find((t) => {
    const tNorm = t.title.toLowerCase().replace(/[^\w\s]/g, "").trim();
    return tNorm === norm || tNorm.includes(norm) || norm.includes(tNorm);
  }) ?? null;
}

export async function persistExtractedTasks(
  userId:          string,
  extracted:       ExtractedTask[],
  opts: {
    conversationId?: string;
    memoryId?:       string;
    minConfidence?:  number;
  } = {},
): Promise<Task[]> {
  const minConf = opts.minConfidence ?? 0.6;
  const created: Task[] = [];

  for (const candidate of extracted) {
    if (candidate.confidence < minConf) continue;

    const existing = await findSimilarOpenTask(userId, candidate.title);
    if (existing) continue;

    const task = await insertTask(userId, {
      title:           candidate.title,
      description:     candidate.description ?? null,
      task_type:       candidate.task_type,
      status:          "open",
      confidence:      candidate.confidence,
      due_date:        candidate.due_date ?? null,
      due_at:          null,
      domains:         (candidate.domains ?? []) as LifeDomain[],
      source_type:     "conversation",
      source_id:       opts.conversationId ?? null,
      memory_id:       opts.memoryId ?? null,
      conversation_id: opts.conversationId ?? null,
      postpone_count:  0,
      metadata:        { source_excerpt: candidate.source_excerpt ?? null },
    });

    if (task) created.push(task);
  }

  return created;
}
