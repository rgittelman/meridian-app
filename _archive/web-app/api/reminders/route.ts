/**
 * GET  /api/reminders — List reminders
 * POST /api/reminders — Create manual reminder
 */

import { NextRequest } from "next/server";
import { requireApiAuth, apiError } from "@/lib/api/auth";
import { safeHandler } from "@/lib/api/safe-handler";
import { getRemindersForUser, insertReminder } from "@/lib/reminders/db";

export const GET = safeHandler(async function GET(req: NextRequest) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const status = req.nextUrl.searchParams.get("status") ?? "pending";
  const reminders = await getRemindersForUser(auth.user.id, {
    status: status === "all" ? undefined : status as never,
    limit:  50,
  });

  return Response.json({ reminders });
});

export const POST = safeHandler(async function POST(req: NextRequest) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  let body: {
    title?:          string;
    body?:           string;
    scheduled_for?:  string;
    scheduled_date?: string;
    domains?:        string[];
  };
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid request body", 400);
  }

  if (!body.title?.trim()) return apiError("title is required", 400);

  const reminder = await insertReminder(auth.user.id, {
    title:          body.title.trim(),
    body:           body.body?.trim() || null,
    reminder_type:  "manual",
    status:         "pending",
    task_id:        null,
    memory_id:      null,
    scheduled_for:  body.scheduled_for ?? null,
    scheduled_date: body.scheduled_date ?? null,
    recurrence:     null,
    why_shown:      "You set this reminder.",
    gentle:         true,
    domains:        (body.domains ?? []) as never,
    metadata:       {},
  });

  if (!reminder) return apiError("Failed to create reminder", 500);
  return Response.json({ reminder }, { status: 201 });
});
