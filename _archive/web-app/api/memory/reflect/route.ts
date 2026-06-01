/**
 * POST /api/memory/reflect — Generate today's daily reflection
 */

import { requireApiAuth } from "@/lib/api/auth";
import { safeHandler } from "@/lib/api/safe-handler";
import { generateDailyReflection } from "@/lib/memory/reflect";

export const POST = safeHandler(async function POST() {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const result = await generateDailyReflection(auth.user.id);

  return Response.json({
    reflection: result.reflection,
    generated:  result.generated,
  });
});
