/**
 * lib/cognition/pattern-synthesis.ts — Internal pattern synthesis.
 *
 * Surfaces recurring themes from memories as compact prompt hints.
 * Patterns influence responses quietly — never quoted to the user.
 */

import type { Memory } from "@/lib/memory/types";
import type { SynthesizedPattern, PatternKind } from "./types";

const SELF_CRITICISM_RE =
  /\b(should have|not good enough| failing|always mess|never get|hard on myself|behind)\b/i;

const STRESS_CATEGORIES = new Set(["recurring_stressors", "emotional_patterns"]);
const GOAL_CATEGORIES   = new Set(["recurring_goals", "priorities"]);
const BLOCKER_CATEGORIES = new Set(["unfinished_tasks", "work_context", "recurring_stressors"]);
const HEALTH_CATEGORIES  = new Set(["health_patterns", "routines", "emotional_patterns"]);
const RELATIONSHIP_CATS  = new Set(["relationships"]);

function addPattern(
  patterns: SynthesizedPattern[],
  kind: PatternKind,
  label: string,
  hint: string,
  strength: number,
  memoryIds: string[],
): void {
  patterns.push({ kind, label, promptHint: hint, strength, memoryIds });
}

/** Synthesize patterns from memory graph. Returns top patterns by strength. */
export function synthesizePatterns(
  memories: Memory[],
  limit = 3,
): SynthesizedPattern[] {
  const active = memories.filter((m) => m.is_active);
  const patterns: SynthesizedPattern[] = [];

  // ── Stress triggers ───────────────────────────────────────────────────────
  const stressMems = active.filter((m) => STRESS_CATEGORIES.has(m.category));
  if (stressMems.length >= 2) {
    const top = stressMems.sort((a, b) => b.reinforcement_count - a.reinforcement_count)[0];
    addPattern(
      patterns, "stress_trigger",
      "Recurring stress",
      `Stress tends to spike around: ${top.summary ?? top.title}. Factor this into advice quietly.`,
      Math.min(1, stressMems.length / 5),
      stressMems.map((m) => m.id),
    );
  }

  // ── Productivity blockers ─────────────────────────────────────────────────
  const blockers = active.filter((m) => BLOCKER_CATEGORIES.has(m.category));
  const highReinBlockers = blockers.filter((m) => m.reinforcement_count >= 2);
  if (highReinBlockers.length >= 1) {
    const top = highReinBlockers[0];
    addPattern(
      patterns, "productivity_blocker",
      "Focus blocker",
      `Open loops and context-switching may be blocking progress on: ${top.title}.`,
      0.7,
      highReinBlockers.map((m) => m.id),
    );
  }

  // ── Mood-energy correlations ────────────────────────────────────────────────
  const healthEmotional = active.filter(
    (m) => HEALTH_CATEGORIES.has(m.category) && m.emotional_intensity >= 0.4,
  );
  if (healthEmotional.length >= 2) {
    addPattern(
      patterns, "mood_energy",
      "Energy pattern",
      "Energy and mood seem linked to daily structure — calmer mornings correlate with better focus.",
      0.65,
      healthEmotional.map((m) => m.id),
    );
  }

  // ── Recurring goals ───────────────────────────────────────────────────────
  const goals = active.filter((m) => GOAL_CATEGORIES.has(m.category));
  if (goals.length >= 1) {
    const top = goals.sort((a, b) => b.importance - a.importance)[0];
    addPattern(
      patterns, "recurring_goal",
      "Long-term aim",
      `A recurring priority is: ${top.summary ?? top.title}. Connect advice to this when relevant.`,
      Math.min(1, top.importance + 0.2),
      goals.map((m) => m.id),
    );
  }

  // ── Relationship themes ───────────────────────────────────────────────────
  const rels = active.filter((m) => RELATIONSHIP_CATS.has(m.category));
  if (rels.length >= 2) {
    addPattern(
      patterns, "relationship_theme",
      "Relationship theme",
      "Relationships are an active area of attention — be thoughtful but not presumptuous.",
      0.55,
      rels.map((m) => m.id),
    );
  }

  // ── Self-criticism loops ──────────────────────────────────────────────────
  const selfCrit = active.filter(
    (m) =>
      m.emotional_valence === "negative" &&
      (SELF_CRITICISM_RE.test(m.content) || SELF_CRITICISM_RE.test(m.title)),
  );
  if (selfCrit.length >= 1) {
    addPattern(
      patterns, "self_criticism",
      "Self-criticism",
      "Tendency toward self-criticism detected — respond with grounded clarity, not reassurance loops.",
      0.75,
      selfCrit.map((m) => m.id),
    );
  }

  // ── High-reinforcement single themes ────────────────────────────────────────
  const reinforced = active.filter((m) => m.reinforcement_count >= 4);
  for (const m of reinforced.slice(0, 2)) {
    if (patterns.some((p) => p.memoryIds.includes(m.id))) continue;
    addPattern(
      patterns, "category_theme",
      m.title,
      `Repeated theme: ${m.summary ?? m.content}. Weave in subtly if relevant.`,
      Math.min(1, m.reinforcement_count / 10),
      [m.id],
    );
  }

  return patterns
    .sort((a, b) => b.strength - a.strength)
    .slice(0, limit);
}

/** Convert patterns to compact prompt hints (max 2 lines). */
export function patternsToHints(patterns: SynthesizedPattern[]): string[] {
  return patterns.slice(0, 2).map((p) => p.promptHint);
}
