/**
 * GET /api/tasks — List user tasks
 * POST /api/tasks — Create manual task
 */

import { NextRequest } from "next/server";
import { requireApiAuth, apiError } from "@/lib/api/auth";
import { safeHandler } from "@/lib/api/safe-handler";
import { getTasksForUser, insertTask } from "@/lib/tasks/db";

export const GET = safeHandler(async function GET(req: NextRequest) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const status = req.nextUrl.searchParams.get("status") ?? "open";
  const tasks = await getTasksForUser(auth.user.id, {
    status: status === "all" ? undefined : status.split(",") as never,
    limit:  50,
  });

  return Response.json({ tasks });
});

export const POST = safeHandler(async function POST(req: NextRequest) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  let body: {
    title?:       string;
    description?: string;
    task_type?:   "hard" | "soft" | "event";
    due_date?:    string;
    due_at?:      string;
    domains?:     string[];
  };
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid request body", 400);
  }

  if (!body.title?.trim()) return apiError("title is required", 400);

  const task = await insertTask(auth.user.id, {
    title:           body.title.trim(),
    description:     body.description?.trim() || null,
    task_type:       body.task_type ?? "soft",
    status:          "open",
    confidence:      1,
    due_date:        body.due_date ?? null,
    due_at:          body.due_at ?? null,
    domains:         (body.domains ?? ["productivity"]) as never,
    source_type:     "manual",
    source_id:       null,
    memory_id:       null,
    conversation_id: null,
    postpone_count:  0,
    metadata:        {},
  });

  if (!task) return apiError("Failed to create task", 500);
  return Response.json({ task }, { status: 201 });
});
