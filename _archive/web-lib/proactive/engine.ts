/**
 * lib/proactive/engine.ts — Lightweight proactive intelligence.
 *
 * Detects patterns and generates subtle observations — no nagging.
 */

import type { Memory } from "@/lib/memory/types";
import type { Task } from "@/lib/tasks/types";
import { synthesizePatterns } from "@/lib/cognition/pattern-synthesis";
import type { ProactiveIntelligence, ProactiveSignal } from "./types";

function recentMemories(memories: Memory[], days = 5): Memory[] {
  const cutoff = Date.now() - days * 86_400_000;
  return memories.filter((m) => new Date(m.last_reinforced_at).getTime() > cutoff);
}

/** Analyze user state and produce calm proactive signals. */
export function detectProactiveSignals(input: {
  memories: Memory[];
  tasks:    Task[];
}): ProactiveIntelligence {
  const { memories, tasks } = input;
  const recent = recentMemories(memories);
  const signals: ProactiveSignal[] = [];

  const stressCount = recent.filter(
    (m) => m.category === "recurring_stressors" || m.emotional_valence === "negative",
  ).length;
  const openTasks = tasks.filter((t) => t.status === "open");
  const overdueTasks = openTasks.filter((t) => t.due_date && t.due_date < new Date().toISOString().split("T")[0]);
  const postponed = openTasks.filter((t) => t.postpone_count >= 2);

  const overloadDetected = stressCount >= 3 || openTasks.length >= 8 || overdueTasks.length >= 2;

  if (overloadDetected) {
    signals.push({
      kind:        "overload",
      label:       "Elevated load",
      observation: "Several stress signals and open items are active.",
      prompt:      "Today might work better with one priority, not five.",
      strength:    0.85,
      domains:     ["productivity", "emotional"],
    });
  }

  // Recurring stress cycle
  const stressMems = recent.filter((m) => m.category === "recurring_stressors");
  if (stressMems.length >= 2) {
    const top = stressMems.sort((a, b) => b.reinforcement_count - a.reinforcement_count)[0];
    signals.push({
      kind:        "stress_cycle",
      label:       "Stress pattern",
      observation: `Stress around "${top.title}" keeps resurfacing.`,
      prompt:      "Worth protecting time before that trigger hits.",
      strength:    0.7,
      domains:     ["emotional", "life"],
    });
  }

  // Neglected goals
  const goals = memories.filter(
    (m) => (m.category === "recurring_goals" || m.category === "priorities") && m.is_active,
  );
  const staleGoals = goals.filter(
    (m) => Date.now() - new Date(m.last_reinforced_at).getTime() > 14 * 86_400_000,
  );
  if (staleGoals.length >= 1) {
    signals.push({
      kind:        "neglected_goal",
      label:       "Quiet priority",
      observation: `"${staleGoals[0].title}" hasn't surfaced in a while.`,
      prompt:      "Still important, or time to let it rest?",
      strength:    0.55,
      domains:     ["goals", "productivity"],
    });
  }

  // Emotional spiral
  const recentNegative = recent.filter(
    (m) => m.emotional_valence === "negative" && m.emotional_intensity >= 0.55,
  );
  if (recentNegative.length >= 2) {
    signals.push({
      kind:        "emotional_spiral",
      label:       "Emotional weight",
      observation: "Negative emotional signals are clustering.",
      prompt:      "Pace matters more than progress right now.",
      strength:    0.75,
      domains:     ["emotional"],
    });
  }

  // Habit inconsistency
  const routines = recent.filter((m) => m.category === "routines" || m.category === "health_patterns");
  const inconsistent = routines.filter((m) => m.emotional_valence === "negative");
  if (inconsistent.length >= 2) {
    signals.push({
      kind:        "habit_inconsistency",
      label:       "Routine drift",
      observation: "Some routines have been harder to maintain lately.",
      prompt:      "One small anchor habit might help — not a full reset.",
      strength:    0.6,
      domains:     ["routines", "health"],
    });
  }

  // Money pressure
  const moneyMems = recent.filter(
    (m) => m.category === "financial_behaviors" || m.domains?.includes("money"),
  );
  if (moneyMems.some((m) => m.emotional_valence === "negative")) {
    signals.push({
      kind:        "money_pressure",
      label:       "Money tension",
      observation: "Financial stress has been present recently.",
      prompt:      "A quick spending check-in might reduce background noise.",
      strength:    0.65,
      domains:     ["money"],
    });
  }

  // Health drift
  const healthMems = recent.filter(
    (m) => m.category === "health_patterns" || m.domains?.includes("health"),
  );
  const poorSleep = healthMems.filter((m) => /sleep|tired|energy/i.test(m.content));
  if (poorSleep.length >= 1) {
    signals.push({
      kind:        "health_drift",
      label:       "Energy pattern",
      observation: "Sleep or energy has come up recently.",
      prompt:      "Protecting rest might matter more than pushing through.",
      strength:    0.6,
      domains:     ["health"],
    });
  }

  // Postponed tasks
  if (postponed.length >= 1) {
    signals.push({
      kind:        "overload",
      label:       "Deferred item",
      observation: `"${postponed[0].title}" keeps getting pushed.`,
      prompt:      "Still relevant, or ready to release it?",
      strength:    0.5,
      domains:     ["productivity"],
    });
  }

  // Pattern synthesis boost
  const patterns = synthesizePatterns(memories, 2);
  for (const p of patterns) {
    if (signals.some((s) => s.label === p.label)) continue;
    if (p.strength >= 0.65) {
      signals.push({
        kind:        "stress_cycle",
        label:       p.label,
        observation: p.promptHint,
        prompt:      "Worth keeping in mind today.",
        strength:    p.strength,
        domains:     ["life"],
      });
    }
  }

  return {
    signals: signals.sort((a, b) => b.strength - a.strength).slice(0, 4),
    overloadDetected,
    generatedAt: new Date().toISOString(),
  };
}
