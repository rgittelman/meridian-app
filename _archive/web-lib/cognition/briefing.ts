/**
 * lib/cognition/briefing.ts — Daily briefing generation pipeline.
 *
 * Architecture-only: produces structured briefing data for future Today UI.
 * Uses heuristics first; optional AI polish when provider is available.
 */

import { aiComplete, isAIAvailable } from "@/lib/ai/service";
import { getMemoriesForUser } from "@/lib/memory/db";
import { synthesizePatterns } from "./pattern-synthesis";
import type { DailyBriefing } from "./types";
import type { Memory } from "@/lib/memory/types";

function recentMemories(memories: Memory[], days = 3): Memory[] {
  const cutoff = Date.now() - days * 86_400_000;
  return memories.filter(
    (m) => new Date(m.last_reinforced_at).getTime() > cutoff,
  );
}

function detectOverload(memories: Memory[]): boolean {
  const stressCount = memories.filter(
    (m) => m.category === "recurring_stressors" || m.category === "unfinished_tasks",
  ).length;
  const recentNegative = memories.filter(
    (m) => m.emotional_valence === "negative" && m.emotional_intensity >= 0.5,
  ).length;
  return stressCount >= 3 || recentNegative >= 2;
}

/** Generate a daily briefing from memory state. Never throws. */
export async function generateDailyBriefing(userId: string): Promise<DailyBriefing> {
  const date = new Date().toISOString().split("T")[0];
  const allMemories = await getMemoriesForUser(userId, { limit: 60 });
  const recent = recentMemories(allMemories);
  const patterns = synthesizePatterns(allMemories, 4);

  const priorities = allMemories
    .filter((m) => m.category === "priorities" || m.category === "recurring_goals")
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 3)
    .map((m) => m.title);

  const unresolved = allMemories
    .filter((m) => m.category === "unfinished_tasks" && m.is_active)
    .sort((a, b) => b.reinforcement_count - a.reinforcement_count)
    .slice(0, 3)
    .map((m) => m.title);

  const overloadDetected = detectOverload(recent);

  // Emotional trend from recent emotional memories
  const emotionalRecent = recent.filter((m) => m.emotional_valence);
  const negativeCount = emotionalRecent.filter((m) => m.emotional_valence === "negative").length;
  const positiveCount = emotionalRecent.filter((m) => m.emotional_valence === "positive").length;

  let emotionalTrend = "Steady — no strong signals either way.";
  if (negativeCount > positiveCount + 1) {
    emotionalTrend = "Some elevated stress in recent days — pace may need protecting.";
  } else if (positiveCount > negativeCount + 1) {
    emotionalTrend = "Generally positive momentum recently.";
  } else if (overloadDetected) {
    emotionalTrend = "Mental load appears elevated — consider narrowing focus.";
  }

  // Morning focus — top priority or pattern-driven
  const goalPattern = patterns.find((p) => p.kind === "recurring_goal");
  const topPriority = priorities[0];
  let morningFocus = topPriority
    ? `Protect time for: ${topPriority}.`
    : "Start with one clear priority before opening everything else.";

  if (goalPattern && !topPriority) {
    morningFocus = goalPattern.promptHint.replace(/^A recurring priority is: /, "Focus on: ");
  }

  if (overloadDetected) {
    morningFocus = `Light day recommended. ${morningFocus}`;
  }

  const patternSummary = patterns.map((p) => p.label);

  const briefing: DailyBriefing = {
    date,
    morningFocus,
    emotionalTrend,
    unresolvedThemes:     unresolved,
    recurringPriorities:  priorities,
    overloadDetected,
    patternSummary,
    generatedAt:          new Date().toISOString(),
  };

  // Optional AI polish (non-blocking failure)
  if (await isAIAvailable() && recent.length >= 2) {
    try {
      const context = [
        `Priorities: ${priorities.join(", ") || "none"}`,
        `Unresolved: ${unresolved.join(", ") || "none"}`,
        `Emotional trend: ${emotionalTrend}`,
        `Patterns: ${patternSummary.join(", ") || "none"}`,
        `Overload: ${overloadDetected}`,
      ].join("\n");

      const result = await aiComplete({
        messages: [{
          role: "user",
          content: `Write a 2-sentence calm morning focus summary. No therapy language. No "I remember". Direct and grounded.\n\nContext:\n${context}`,
        }],
        maxTokens: 80,
        temperature: 0.3,
      });

      if (result.content.trim().length > 20) {
        briefing.morningFocus = result.content.trim();
      }
    } catch {
      // keep heuristic version
    }
  }

  return briefing;
}
