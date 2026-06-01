/**
 * POST /api/chat — Memory-aware streaming chat.
 *
 * 1. Validates session
 * 2. Assembles memory + cognition context
 * 3. Streams via centralized AI provider layer
 * 4. Persists assistant message after stream completes
 */

import { NextRequest } from "next/server";
import { requireApiAuth, apiError } from "@/lib/api/auth";
import { safeHandler } from "@/lib/api/safe-handler";
import { assembleContext } from "@/lib/context/assemble";
import { buildChatSystemPrompt } from "@/lib/ai/prompts";
import { aiStream, trimMessages } from "@/lib/ai/service";
import { isMemoryDebugEnabled, memoryLog } from "@/lib/memory/debug";
import { insertMessage, getConversation } from "@/lib/conversations/db";
import {
  filterMeridianResponse,
  filterDiff,
  chunkForStream,
} from "@/lib/cognition/response-filter";

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

  const messages = body.messages ?? [];
  if (!Array.isArray(messages) || messages.length === 0) {
    return apiError("messages array is required", 400);
  }

  const conversationId = body.conversationId;
  if (conversationId) {
    const conv = await getConversation(auth.user.id, conversationId);
    if (!conv) return apiError("Conversation not found", 404);
  }

  const trimmed = trimMessages(messages);
  const lastUserMessage = [...trimmed].reverse().find((m) => m.role === "user");

  let ctx: Awaited<ReturnType<typeof assembleContext>> | null = null;
  try {
    ctx = await assembleContext({
      userId:   auth.user.id,
      query:    lastUserMessage?.content,
      messages: trimmed,
    });
  } catch (ctxErr) {
    console.error("[chat] context assembly failed:", ctxErr instanceof Error ? ctxErr.message : ctxErr);
  }

  const systemPrompt = ctx
    ? buildChatSystemPrompt({
        userName:          ctx.userName ?? undefined,
        preferredTone:     ctx.preferredTone,
        memories:          ctx.memories,
        compressedHistory: ctx.compressedHistory ?? undefined,
        toneState:         ctx.tone.state,
        rhythmGuidance:    ctx.rhythmGuidance,
        patternHints:      ctx.patternHints,
      })
    : buildChatSystemPrompt({});

  if (ctx && isMemoryDebugEnabled()) {
    memoryLog("chat:prompt", {
      memory_count:      ctx.memories.length,
      memory_ids:        ctx.memories.map((m) => m.id),
      tone_state:        ctx.tone.state,
      pattern_count:     ctx.patterns.length,
      system_prompt_len: systemPrompt.length,
      influence:         ctx.memoryInfluence,
    });
  }

  let streamResult;
  try {
    streamResult = await aiStream({
      messages: [{ role: "system", content: systemPrompt }, ...trimmed],
    });
  } catch (aiErr) {
    console.error("[chat] AI unavailable:", aiErr instanceof Error ? aiErr.message : aiErr);
    return apiError("AI service unavailable — check your AI_PROVIDER configuration", 503);
  }

  const encoder = new TextEncoder();
  let rawContent = "";

  const memoryHints = (ctx?.memories ?? [])
    .slice(0, 3)
    .map((m) => m.summary ?? m.content);

  const readable = new ReadableStream({
    async start(controller) {
      try {
        // Buffer model output — filter runs after generation completes
        for await (const token of streamResult.stream) {
          rawContent += token;
        }

        const filtered = filterMeridianResponse({
          rawResponse:  rawContent,
          toneState:    ctx?.tone.state ?? "neutral",
          userMessage:  lastUserMessage?.content ?? "",
          memoryHints,
          patternHints: ctx?.patternHints ?? [],
        });

        if (ctx && isMemoryDebugEnabled()) {
          const diff = filterDiff(rawContent, filtered);
          if (diff.changed) {
            memoryLog("chat:filter", {
              tone_state:   ctx.tone.state,
              chars_before: diff.charsBefore,
              chars_after:  diff.charsAfter,
              raw_preview:  rawContent.slice(0, 120),
              out_preview:  filtered.slice(0, 120),
            });
          }
        }

        // Pseudo-stream filtered response (sentence chunks, no client changes)
        for (const chunk of chunkForStream(filtered)) {
          controller.enqueue(encoder.encode(chunk));
        }

        if (conversationId && filtered.trim()) {
          try {
            await insertMessage(auth.user.id, conversationId, {
              role:    "assistant",
              content: filtered,
              status:  "sent",
              metadata: {
                memory_count: ctx?.memories.length ?? 0,
                tone_state:   ctx?.tone.state ?? "neutral",
                provider:     streamResult.provider,
                filtered:     rawContent.trim() !== filtered.trim(),
              },
            });
          } catch (persistErr) {
            console.error("[chat] message persist failed:", persistErr instanceof Error ? persistErr.message : persistErr);
          }
        }
      } catch (err) {
        console.error("[chat] stream error:", err instanceof Error ? err.message : err);
        if (!rawContent.trim()) {
          controller.enqueue(
            encoder.encode("I'm having trouble connecting right now. Please try again in a moment."),
          );
        }
      } finally {
        controller.close();
      }
    },
  });

  const headers: Record<string, string> = {
    "Content-Type":      "text/plain; charset=utf-8",
    "Transfer-Encoding": "chunked",
    "X-Memory-Count":    String(ctx?.memories.length ?? 0),
    "X-Memory-Ids":      ctx?.memories.map((m) => m.id).join(",") ?? "",
    "X-AI-Provider":     streamResult.provider,
    "X-Tone-State":      ctx?.tone.state ?? "neutral",
    "X-Pattern-Count":   String(ctx?.patterns.length ?? 0),
  };

  if (ctx && isMemoryDebugEnabled()) {
    headers["X-Memory-Influence"] = Buffer.from(
      JSON.stringify(ctx.memoryInfluence),
    ).toString("base64url");
  }

  return new Response(readable, { headers });
});
