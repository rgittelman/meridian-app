/**
 * GET /api/reminders — List pending reminders
 */

import { NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/api/auth";
import { safeHandler } from "@/lib/api/safe-handler";
import { getRemindersForUser } from "@/lib/reminders/db";

export const GET = safeHandler(async function GET(req: NextRequest) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const status = req.nextUrl.searchParams.get("status") ?? "pending";
  const reminders = await getRemindersForUser(auth.user.id, {
    status: status === "all" ? undefined : status as never,
    limit:  20,
  });

  return Response.json({ reminders });
});
