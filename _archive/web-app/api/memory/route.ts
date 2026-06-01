/**
 * GET  /api/memory — List user's memories (with optional category filter)
 * POST /api/memory — Manually create a memory
 */

import { NextRequest } from "next/server";
import { requireApiAuth, apiError } from "@/lib/api/auth";
import { safeHandler } from "@/lib/api/safe-handler";
import { getMemoriesForUser, insertMemory, isValidCategory } from "@/lib/memory/db";
import { generateEmbedding } from "@/lib/ai/embeddings";
import { insertEmbedding } from "@/lib/memory/db";
import { sanitizeMemoryContent, validateExtractedMemory } from "@/lib/memory/safety";
import { computeMemoryDomains } from "@/lib/domains/retrieve";
import type { MemoryCategory } from "@/lib/memory/types";

export const GET = safeHandler(async function GET(req: NextRequest) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const category = req.nextUrl.searchParams.get("category");
  const limit    = Number(req.nextUrl.searchParams.get("limit") ?? 50);

  const memories = await getMemoriesForUser(auth.user.id, {
    categories: category && isValidCategory(category)
      ? [category as MemoryCategory]
      : undefined,
    limit,
  });

  return Response.json({ memories });
});

export const POST = safeHandler(async function POST(req: NextRequest) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid request body", 400);
  }

  const { category, title, content, why_remembered } = body;

  if (
    typeof category !== "string" || !isValidCategory(category) ||
    typeof title   !== "string" || !title.trim() ||
    typeof content !== "string" || !content.trim()
  ) {
    return apiError("category, title, and content are required", 400);
  }

  if (!validateExtractedMemory({ title, content, why_remembered: String(why_remembered ?? "") })) {
    return apiError("Content cannot be stored for safety reasons", 422);
  }

  const safeTitle   = sanitizeMemoryContent(title)!;
  const safeContent = sanitizeMemoryContent(content)!;
  const cat = category as MemoryCategory;
  const domains = computeMemoryDomains({
    category: cat, title: safeTitle, content: safeContent,
  });

  const memory = await insertMemory(auth.user.id, {
    category:            cat,
    title:               safeTitle,
    content:             safeContent,
    summary:             safeContent.slice(0, 120),
    confidence:          1.0,
    importance:          0.7,
    emotional_valence:   "neutral",
    emotional_intensity: 0,
    source_type:         "manual",
    source_id:           null,
    source_excerpt:      null,
    why_remembered:      typeof why_remembered === "string" ? why_remembered : "Added manually by user.",
    metadata:            {},
    domains,
    reinforcement_count: 1,
    last_reinforced_at:  new Date().toISOString(),
    is_active:           true,
  });

  if (!memory) return apiError("Failed to create memory");

  const embedding = await generateEmbedding(`${safeTitle} ${safeContent}`);
  if (embedding) {
    await insertEmbedding(auth.user.id, memory.id, embedding, "manual");
  }

  return Response.json({ memory }, { status: 201 });
});
