/**
 * lib/memory/db.ts — Typed Supabase wrappers for memory operations.
 *
 * All memory database access goes through this module.
 * Callers never construct raw Supabase queries for memory tables.
 */

import { reinforcementImportanceBump } from "@/lib/cognition/memory-weight";
import { createClient } from "@/lib/supabase/server";
import type {
  Memory,
  MemoryCategory,
  MemoryEmbedding,
  DailyReflection,
  UserMemoryPreferences,
} from "./types";
import { MEMORY_CATEGORIES } from "./types";

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getMemoriesForUser(
  userId:     string,
  options: {
    categories?:  MemoryCategory[];
    domains?:     string[];
    activeOnly?:  boolean;
    limit?:       number;
  } = {},
): Promise<Memory[]> {
  const supabase = await createClient();
  let query = supabase
    .from("memories")
    .select("*")
    .eq("user_id", userId)
    .order("last_reinforced_at", { ascending: false });

  if (options.activeOnly !== false) query = query.eq("is_active", true);
  if (options.categories?.length)   query = query.in("category", options.categories);
  if (options.domains?.length)      query = query.overlaps("domains", options.domains);
  if (options.limit)                query = query.limit(options.limit);

  let { data, error } = await query;

  if (error?.message?.includes("is_active")) {
    console.warn("[memory/db] is_active column missing, retrying without filter. Run migration 007.");
    let fallback = supabase
      .from("memories")
      .select("*")
      .eq("user_id", userId)
      .order("last_reinforced_at", { ascending: false });
    if (options.categories?.length) fallback = fallback.in("category", options.categories);
    if (options.domains?.length)    fallback = fallback.overlaps("domains", options.domains);
    if (options.limit)              fallback = fallback.limit(options.limit);
    const res = await fallback;
    data = res.data;
    error = res.error;
  }

  if (error) {
    console.error("[memory/db] getMemoriesForUser:", error.message);
    return [];
  }
  return (data ?? []).map((m) => ({
    ...(m as Memory),
    domains: (m as Memory).domains ?? [],
  }));
}

export async function getMemoryById(
  userId:   string,
  memoryId: string,
): Promise<Memory | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memories")
    .select("*")
    .eq("user_id", userId)
    .eq("id", memoryId)
    .single();

  if (error) return null;
  return data as Memory;
}

export async function getEmbeddingsForUser(userId: string): Promise<MemoryEmbedding[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memory_embeddings")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    console.error("[memory/db] getEmbeddingsForUser:", error.message);
    return [];
  }
  return (data ?? []) as MemoryEmbedding[];
}

export async function getUserMemoryPreferences(userId: string): Promise<UserMemoryPreferences> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_preferences")
    .select("memory_enabled, personalization_enabled, disabled_memory_categories")
    .eq("user_id", userId)
    .single();

  return {
    memory_enabled:             data?.memory_enabled             ?? true,
    personalization_enabled:    data?.personalization_enabled    ?? true,
    disabled_memory_categories: (data?.disabled_memory_categories ?? []) as MemoryCategory[],
  };
}

export async function getDailyReflection(
  userId: string,
  date:   string,
): Promise<DailyReflection | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("daily_reflections")
    .select("*")
    .eq("user_id", userId)
    .eq("reflection_date", date)
    .single();

  return data as DailyReflection | null;
}

// ── Write ─────────────────────────────────────────────────────────────────────

export async function insertMemory(
  userId: string,
  memory: Omit<Memory, "id" | "user_id" | "created_at" | "updated_at">,
): Promise<Memory | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memories")
    .insert({ ...memory, user_id: userId })
    .select()
    .single();

  if (error) {
    console.error("[memory/db] insertMemory:", error.message);
    return null;
  }
  return data as Memory;
}

export async function reinforceMemory(memoryId: string, userId: string): Promise<void> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("memories")
    .select("reinforcement_count, importance, emotional_intensity")
    .eq("id", memoryId)
    .eq("user_id", userId)
    .single();

  const newImportance = existing
    ? reinforcementImportanceBump(existing.importance ?? 0.5, existing.emotional_intensity ?? 0)
    : 0.5;

  await supabase
    .from("memories")
    .update({
      reinforcement_count: existing ? existing.reinforcement_count + 1 : 1,
      importance:          newImportance,
      last_reinforced_at:  new Date().toISOString(),
    })
    .eq("id", memoryId)
    .eq("user_id", userId);
}

export async function updateMemoryDomains(
  userId:   string,
  memoryId: string,
  domains:  string[],
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("memories")
    .update({ domains })
    .eq("id", memoryId)
    .eq("user_id", userId);

  return !error;
}

export async function insertEmbedding(
  userId:    string,
  memoryId:  string,
  embedding: number[],
  model:     string,
): Promise<void> {
  const supabase = await createClient();
  await supabase.from("memory_embeddings").insert({
    user_id:   userId,
    memory_id: memoryId,
    embedding,
    model,
  });
}

export async function deleteMemory(userId: string, memoryId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("memories")
    .delete()
    .eq("id", memoryId)
    .eq("user_id", userId);

  return !error;
}

export async function wipeAllMemories(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("memories")
    .delete()
    .eq("user_id", userId);

  return !error;
}

export async function updateMemoryPreferences(
  userId: string,
  prefs:  Partial<UserMemoryPreferences>,
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_preferences")
    .update(prefs)
    .eq("user_id", userId);

  return !error;
}

export async function insertDailyReflection(
  userId:     string,
  reflection: Omit<DailyReflection, "id" | "user_id" | "created_at">,
): Promise<DailyReflection | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_reflections")
    .upsert({ ...reflection, user_id: userId }, { onConflict: "user_id,reflection_date" })
    .select()
    .single();

  if (error) {
    console.error("[memory/db] insertDailyReflection:", error.message);
    return null;
  }
  return data as DailyReflection;
}

/** Validate that a string is a known memory category. */
export function isValidCategory(cat: string): cat is MemoryCategory {
  return (MEMORY_CATEGORIES as readonly string[]).includes(cat);
}
