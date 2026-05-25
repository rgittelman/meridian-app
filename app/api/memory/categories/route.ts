/**
 * GET  /api/memory/categories — Get memory preferences (enabled categories)
 * PATCH /api/memory/categories — Update memory preferences and category opt-outs
 */

import { NextRequest } from "next/server";
import { requireApiAuth, apiError } from "@/lib/api/auth";
import { safeHandler } from "@/lib/api/safe-handler";
import {
  getUserMemoryPreferences,
  updateMemoryPreferences,
} from "@/lib/memory/db";
import { isValidCategory } from "@/lib/memory/db";
import type { MemoryCategory } from "@/lib/memory/types";

export const GET = safeHandler(async function GET() {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const prefs = await getUserMemoryPreferences(auth.user.id);
  return Response.json(prefs);
});

export const PATCH = safeHandler(async function PATCH(req: NextRequest) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid request body", 400);
  }

  const updates: Partial<{
    memory_enabled:             boolean;
    personalization_enabled:    boolean;
    disabled_memory_categories: MemoryCategory[];
  }> = {};

  if (typeof body.memory_enabled === "boolean") {
    updates.memory_enabled = body.memory_enabled;
  }
  if (typeof body.personalization_enabled === "boolean") {
    updates.personalization_enabled = body.personalization_enabled;
  }
  if (Array.isArray(body.disabled_memory_categories)) {
    updates.disabled_memory_categories = body.disabled_memory_categories.filter(
      (c): c is MemoryCategory => typeof c === "string" && isValidCategory(c),
    );
  }

  const success = await updateMemoryPreferences(auth.user.id, updates);
  if (!success) return apiError("Failed to update preferences");

  const prefs = await getUserMemoryPreferences(auth.user.id);
  return Response.json(prefs);
});
