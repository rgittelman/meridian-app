/**
 * PATCH /api/tasks/[id] — Update task (status, title, due_date, etc.)
 * DELETE /api/tasks/[id] — Delete task
 */

import { NextRequest } from "next/server";
import { requireApiAuth, apiError } from "@/lib/api/auth";
import { safeHandler } from "@/lib/api/safe-handler";
import { updateTaskStatus, updateTask } from "@/lib/tasks/db";
import { createClient } from "@/lib/supabase/server";
import type { TaskStatus } from "@/lib/tasks/types";

export const PATCH = safeHandler(async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid request body", 400);
  }

  if (body.status) {
    const status = body.status as TaskStatus;
    if (!["done", "dismissed", "snoozed", "open"].includes(status)) {
      return apiError("status must be done | dismissed | snoozed | open", 400);
    }

    if (status === "snoozed") {
      const supabase = await createClient();
      const { data } = await supabase
        .from("tasks")
        .select("postpone_count")
        .eq("id", id)
        .eq("user_id", auth.user.id)
        .single();
      await updateTaskStatus(auth.user.id, id, status, {
        postpone_count: (data?.postpone_count ?? 0) + 1,
      });
    } else {
      await updateTaskStatus(auth.user.id, id, status);
    }

    return Response.json({ ok: true, id, status });
  }

  const fields: Record<string, unknown> = {};
  if (typeof body.title === "string")       fields.title       = body.title.trim();
  if (typeof body.description === "string") fields.description = body.description.trim() || null;
  if (typeof body.due_date === "string" || body.due_date === null) fields.due_date = body.due_date;
  if (typeof body.due_at === "string" || body.due_at === null)     fields.due_at   = body.due_at;

  if (Object.keys(fields).length === 0) {
    return apiError("No fields to update", 400);
  }

  const ok = await updateTask(auth.user.id, id, fields);
  if (!ok) return apiError("Task not found", 404);

  return Response.json({ ok: true, id });
});

export const DELETE = safeHandler(async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.user.id);

  if (error) return apiError("Task not found", 404);
  return Response.json({ ok: true });
});
