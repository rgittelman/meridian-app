/**
 * GET /api/briefing — Daily briefing generation pipeline.
 */

import { requireApiAuth, apiError } from "@/lib/api/auth";
import { safeHandler } from "@/lib/api/safe-handler";
import { generateDailyBriefing } from "@/lib/cognition/briefing";

export const GET = safeHandler(async function GET() {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  try {
    const briefing = await generateDailyBriefing(auth.user.id);
    return Response.json(briefing);
  } catch (err) {
    console.error("[briefing] error:", err instanceof Error ? err.message : err);
    return apiError("Failed to generate briefing", 500);
  }
});
