/**
 * PATCH /api/reminders/[id] — Dismiss or snooze reminder
 */

import { NextRequest } from "next/server";
import { requireApiAuth, apiError } from "@/lib/api/auth";
import { safeHandler } from "@/lib/api/safe-handler";
import { updateReminderStatus } from "@/lib/reminders/db";

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

  if (!body.status || !["dismissed", "snoozed", "sent"].includes(body.status)) {
    return apiError("status must be dismissed | snoozed | sent", 400);
  }

  const ok = await updateReminderStatus(auth.user.id, id, body.status as never);
  if (!ok) return apiError("Reminder not found", 404);

  return Response.json({ ok: true, id, status: body.status });
});
