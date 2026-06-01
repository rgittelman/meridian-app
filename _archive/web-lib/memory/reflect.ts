/**
 * lib/memory/reflect.ts — Lightweight reflection engine.
 *
 * Generates a daily reflection summary from the user's active memories.
 * Intended to run once per day (cron or on first app open).
 */

import { aiComplete } from "@/lib/ai/service";
import { buildReflectionPrompt } from "@/lib/ai/prompts";
import {
  getMemoriesForUser,
  getDailyReflection,
  insertDailyReflection,
} from "./db";
import { isMemoryDebugEnabled, memoryLog } from "./debug";
import type { DailyReflection } from "./types";

interface ReflectionResult {
  reflection: DailyReflection | null;
  generated:  boolean;
}

/** Generate or retrieve today's reflection for a user. */
export async function generateDailyReflection(
  userId: string,
  date?: string,
): Promise<ReflectionResult> {
  const reflectionDate = date ?? new Date().toISOString().split("T")[0];

  // Return cached reflection if already generated today
  const existing = await getDailyReflection(userId, reflectionDate);
  if (existing) return { reflection: existing, generated: false };

  // Gather memories reinforced or created in the last 24 hours
  const allMemories = await getMemoriesForUser(userId, { limit: 50 });
  const oneDayAgo   = Date.now() - 86_400_000;

  const recentMemories = allMemories.filter(
    (m) => new Date(m.last_reinforced_at).getTime() > oneDayAgo,
  );

  if (recentMemories.length === 0) {
    memoryLog("reflect:skipped", { reason: "no_recent_memories", date: reflectionDate });
    return { reflection: null, generated: false };
  }

  memoryLog("reflect:start", {
    date: reflectionDate,
    memory_count: recentMemories.length,
    memory_ids: recentMemories.map((m) => m.id),
  });

  try {
    const prompt = buildReflectionPrompt(
      recentMemories.map((m) => ({
        title:    m.title,
        category: m.category,
        content:  m.summary ?? m.content,
      })),
      reflectionDate,
    );

    const aiResult = await aiComplete({
      messages:    [{ role: "user", content: prompt }],
      maxTokens:   400,
      temperature: 0.4,
    });

    const cleaned = aiResult.content.replace(/```json\n?|\n?```/g, "").trim();
    const parsed  = JSON.parse(cleaned);

    const reflection = await insertDailyReflection(userId, {
      reflection_date: reflectionDate,
      summary:         parsed.summary ?? "",
      emotional_tone:  parsed.emotional_tone ?? "neutral",
      key_themes:      parsed.key_themes ?? [],
      memory_ids:      recentMemories.map((m) => m.id),
      insights:        parsed.insights ?? {},
    });

    memoryLog("reflect:complete", {
      generated: true,
      emotional_tone: parsed.emotional_tone,
      key_themes: parsed.key_themes,
      memory_ids: recentMemories.map((m) => m.id),
    });

    return { reflection, generated: true };
  } catch (err) {
    console.error("[memory/reflect] error:", err instanceof Error ? err.message : err);
    return { reflection: null, generated: false };
  }
}

/** Detect recurring patterns across a user's memory set. */
export function detectRecurringPatterns(
  memories: { category: string; title: string; reinforcement_count: number }[],
): string[] {
  const patterns: string[] = [];

  // Category frequency
  const categoryCounts: Record<string, number> = {};
  for (const m of memories) {
    categoryCounts[m.category] = (categoryCounts[m.category] ?? 0) + 1;
  }

  for (const [cat, count] of Object.entries(categoryCounts)) {
    if (count >= 3) {
      patterns.push(`Recurring theme in ${cat.replace(/_/g, " ")} (${count} memories)`);
    }
  }

  // Highly reinforced memories (mentioned 3+ times)
  const reinforced = memories.filter((m) => m.reinforcement_count >= 3);
  for (const m of reinforced.slice(0, 3)) {
    patterns.push(`Frequently referenced: "${m.title}"`);
  }

  return patterns;
}
