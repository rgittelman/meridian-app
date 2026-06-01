/**
 * PATCH  /api/reminders/[id] — Dismiss or snooze reminder
 * DELETE /api/reminders/[id] — Delete reminder
 */

import { NextRequest } from "next/server";
import { requireApiAuth, apiError } from "@/lib/api/auth";
import { safeHandler } from "@/lib/api/safe-handler";
import { updateReminderStatus } from "@/lib/reminders/db";
import { createClient } from "@/lib/supabase/server";

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

  if (!body.status || !["dismissed", "snoozed", "sent", "pending"].includes(body.status)) {
    return apiError("status must be dismissed | snoozed | sent | pending", 400);
  }

  const ok = await updateReminderStatus(auth.user.id, id, body.status as never);
  if (!ok) return apiError("Reminder not found", 404);

  return Response.json({ ok: true, id, status: body.status });
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
    .from("reminders")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.user.id);

  if (error) return apiError("Reminder not found", 404);
  return Response.json({ ok: true });
});
