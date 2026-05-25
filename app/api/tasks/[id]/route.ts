/**
 * PATCH /api/tasks/[id] — Update task status (done, dismissed, snoozed)
 * DELETE /api/tasks/[id] — Delete task
 */

import { NextRequest } from "next/server";
import { requireApiAuth, apiError } from "@/lib/api/auth";
import { safeHandler } from "@/lib/api/safe-handler";
import { updateTaskStatus } from "@/lib/tasks/db";
import { createClient } from "@/lib/supabase/server";
import type { TaskStatus } from "@/lib/tasks/types";

export const PATCH = safeHandler(async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid request body", 400);
  }

  const status = body.status as TaskStatus | undefined;
  if (!status || !["done", "dismissed", "snoozed", "open"].includes(status)) {
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
