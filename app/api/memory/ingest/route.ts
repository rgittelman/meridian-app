/**
 * POST /api/memory/ingest — Ingest memories + run OS loop (tasks, reminders, domains)
 */

import { NextRequest } from "next/server";
import { requireApiAuth, apiError } from "@/lib/api/auth";
import { safeHandler } from "@/lib/api/safe-handler";
import { ingestFromConversation } from "@/lib/memory/ingest";
import { runOSLoop } from "@/lib/os/loop";
import { isMemoryDebugEnabled } from "@/lib/memory/debug";

export const POST = safeHandler(async function POST(req: NextRequest) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  let body: {
    messages?:        { role: "user" | "assistant"; content: string }[];
    conversationId?:  string;
  };
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid request body", 400);
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return apiError("messages array is required", 400);
  }

  const result = await ingestFromConversation({
    userId:     auth.user.id,
    messages:   body.messages,
    sourceId:   body.conversationId,
  });

  const osLoop = await runOSLoop({
    userId:              auth.user.id,
    messages:            body.messages,
    conversationId:      body.conversationId,
    newMemories:         result.created,
    reinforcedMemories:  result.reinforced,
  });

  const response: Record<string, unknown> = {
    created:    result.created.length,
    reinforced: result.reinforced.length,
    skipped:    result.skipped,
    created_memories: result.created.map((m) => ({
      id: m.id, title: m.title, category: m.category,
      confidence: m.confidence, domains: m.domains ?? [],
    })),
    reinforced_ids: result.reinforced.map((m) => m.id),
    os_loop: osLoop,
    chat_action: osLoop.chatAction ?? null,
  };

  if (isMemoryDebugEnabled() && result.debug) {
    response.debug = result.debug;
  }

  return Response.json(response);
});
