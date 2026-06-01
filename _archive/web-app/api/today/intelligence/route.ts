/**
 * GET /api/today/intelligence — Dynamic Today intelligence pipeline
 */

import { requireApiAuth, apiError } from "@/lib/api/auth";
import { safeHandler } from "@/lib/api/safe-handler";
import { assembleTodayIntelligence } from "@/lib/today/intelligence";

export const GET = safeHandler(async function GET() {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  try {
    const intelligence = await assembleTodayIntelligence(auth.user.id);
    return Response.json(intelligence);
  } catch (err) {
    console.error("[today/intelligence] error:", err instanceof Error ? err.message : err);
    return apiError("Failed to assemble Today intelligence", 500);
  }
});
