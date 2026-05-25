/**
 * GET /api/memory/export — Export all user memories as JSON
 */

import { requireApiAuth } from "@/lib/api/auth";
import { safeHandler } from "@/lib/api/safe-handler";
import { getMemoriesForUser } from "@/lib/memory/db";

export const GET = safeHandler(async function GET() {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const memories = await getMemoriesForUser(auth.user.id, {
    activeOnly: false,
    limit:      1000,
  });

  const exportData = {
    exported_at: new Date().toISOString(),
    user_id:     auth.user.id,
    count:       memories.length,
    memories:    memories.map((m) => ({
      id:                  m.id,
      category:            m.category,
      title:               m.title,
      content:             m.content,
      summary:             m.summary,
      confidence:          m.confidence,
      importance:          m.importance,
      emotional_valence:   m.emotional_valence,
      why_remembered:      m.why_remembered,
      reinforcement_count: m.reinforcement_count,
      created_at:          m.created_at,
      last_reinforced_at:  m.last_reinforced_at,
    })),
  };

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type":        "application/json",
      "Content-Disposition": `attachment; filename="meridian-memories-${new Date().toISOString().split("T")[0]}.json"`,
    },
  });
});
