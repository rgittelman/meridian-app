/**
 * POST /api/memory/wipe — Delete all memories for the authenticated user
 */

import { requireApiAuth, apiError } from "@/lib/api/auth";
import { safeHandler } from "@/lib/api/safe-handler";
import { wipeAllMemories } from "@/lib/memory/db";

export const POST = safeHandler(async function POST() {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const success = await wipeAllMemories(auth.user.id);
  if (!success) return apiError("Failed to wipe memories");

  return Response.json({ wiped: true });
});
