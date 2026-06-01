/**
 * POST /api/memory/debug — Developer test panel actions.
 *
 * Actions:
 *   reflect  — generate today's daily reflection
 *   retrieve — simulate memory retrieval with scores
 *   assemble — inspect full active context assembly
 *   ingest   — run ingestion on provided messages
 *
 * Only available when NODE_ENV=development or MEMORY_DEBUG=true.
 */

import { NextRequest } from "next/server";
import { requireApiAuth, apiError } from "@/lib/api/auth";
import { safeHandler } from "@/lib/api/safe-handler";
import { isMemoryDebugEnabled } from "@/lib/memory/debug";
import { simulateRetrieval } from "@/lib/memory/retrieve";
import { inspectContext } from "@/lib/context/assemble";
import { generateDailyReflection } from "@/lib/memory/reflect";
import { ingestFromConversation } from "@/lib/memory/ingest";
import { generateDailyBriefing } from "@/lib/cognition/briefing";
import { buildChatSystemPrompt } from "@/lib/ai/prompts";

export const POST = safeHandler(async function POST(req: NextRequest) {
  if (!isMemoryDebugEnabled()) {
    return apiError("Debug endpoints disabled in production", 403);
  }

  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  let body: {
    action?:   string;
    query?:    string;
    messages?: { role: "user" | "assistant"; content: string }[];
  };

  try {
    body = await req.json();
  } catch {
    return apiError("Invalid request body", 400);
  }

  const { action, query, messages } = body;

  switch (action) {
    case "reflect": {
      const result = await generateDailyReflection(auth.user.id);
      return Response.json({
        action:     "reflect",
        generated:  result.generated,
        reflection: result.reflection,
      });
    }

    case "retrieve": {
      const result = await simulateRetrieval(auth.user.id, query);
      return Response.json({
        action:   "retrieve",
        query:    query ?? null,
        count:    result.memories.length,
        memories: result.memories.map((m) => ({
          id:        m.id,
          title:     m.title,
          category:  m.category,
          score:     +m.score.toFixed(3),
          breakdown: m.score_breakdown,
        })),
        debug: result.debug,
      });
    }

    case "assemble": {
      const ctx = await inspectContext(auth.user.id, query, messages);
      const systemPrompt = buildChatSystemPrompt({
        userName:          ctx.userName ?? undefined,
        preferredTone:     ctx.preferredTone,
        memories:          ctx.memories,
        compressedHistory: ctx.compressedHistory ?? undefined,
        toneState:         ctx.tone.state,
        rhythmGuidance:    ctx.rhythmGuidance,
        patternHints:      ctx.patternHints,
      });

      return Response.json({
        action: "assemble",
        context: {
          userName:               ctx.userName,
          preferredTone:          ctx.preferredTone,
          memory_count:           ctx.memories.length,
          memories: ctx.memories.map((m) => ({
            id: m.id, title: m.title, category: m.category, score: +m.score.toFixed(3),
          })),
          compressedHistory:      ctx.compressedHistory,
          tone:                   ctx.tone,
          rhythmGuidance:         ctx.rhythmGuidance,
          patterns:               ctx.patterns,
          patternHints:           ctx.patternHints,
          memoryInfluence:        ctx.memoryInfluence,
          memoryEnabled:          ctx.memoryEnabled,
          personalizationEnabled: ctx.personalizationEnabled,
        },
        system_prompt_preview: systemPrompt.slice(0, 800),
        system_prompt_length:  systemPrompt.length,
        debug: ctx.debug,
      });
    }

    case "briefing": {
      const briefing = await generateDailyBriefing(auth.user.id);
      return Response.json({ action: "briefing", briefing });
    }

    case "ingest": {
      if (!messages?.length) {
        return apiError("messages required for ingest action", 400);
      }
      const result = await ingestFromConversation({
        userId:   auth.user.id,
        messages,
      });
      return Response.json({
        action:     "ingest",
        created:    result.created.length,
        reinforced: result.reinforced.length,
        skipped:    result.skipped,
        debug:      result.debug,
      });
    }

    default:
      return apiError(
        "Unknown action. Use: reflect | retrieve | assemble | ingest | briefing",
        400,
      );
  }
});
