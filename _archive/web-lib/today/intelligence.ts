/**
 * lib/today/intelligence.ts — Today dynamic intelligence pipeline.
 */

import { generateDailyBriefing } from "@/lib/cognition/briefing";
import { getMemoriesForUser } from "@/lib/memory/db";
import { getTasksForUser } from "@/lib/tasks/db";
import { getRemindersForUser } from "@/lib/reminders/db";
import { detectProactiveSignals } from "@/lib/proactive/engine";
import { synthesizePatterns } from "@/lib/cognition/pattern-synthesis";
import { deriveEmotionalWeather } from "./emotional-weather";
import type { TodayIntelligence } from "./types";
import type { Memory } from "@/lib/memory/types";
import type { Task } from "@/lib/tasks/types";

const today = () => new Date().toISOString().split("T")[0];

function buildMorningFocusItems(
  tasks: Task[],
  priorities: string[],
  themes: { id: string; label: string }[],
  date: string,
): TodayIntelligence["morningFocusItems"] {
  const items: TodayIntelligence["morningFocusItems"] = [];
  const seen = new Set<string>();

  const add = (item: TodayIntelligence["morningFocusItems"][number]) => {
    const key = item.title.toLowerCase();
    if (seen.has(key) || items.length >= 3) return;
    seen.add(key);
    items.push(item);
  };

  for (const t of tasks.filter((x) => x.due_date && x.due_date < date)) {
    add({ id: t.id, title: t.title, source: "task", dueLabel: "Overdue" });
  }

  for (const t of tasks.filter((x) => x.task_type === "hard" && x.status === "open")) {
    add({
      id:       t.id,
      title:    t.title,
      source:   "task",
      dueLabel: t.due_date === date ? "Today" : t.due_date ?? undefined,
    });
  }

  for (const p of priorities.slice(0, 2)) {
    add({ id: `priority-${p}`, title: p, source: "priority" });
  }

  if (items.length < 3 && themes[0]) {
    add({ id: themes[0].id, title: themes[0].label, source: "theme" });
  }

  return items.slice(0, 3);
}

function buildDomainSignals(memories: Memory[]): TodayIntelligence["domainSignals"] {
  const health = memories.find(
    (m) => m.domains?.includes("health") || m.category === "health_patterns",
  );
  const money = memories.find(
    (m) => m.domains?.includes("money") || m.category === "financial_behaviors",
  );
  const life = memories.find(
    (m) => m.domains?.includes("life") || m.category === "recurring_stressors" || m.category === "routines",
  );

  const healthLine = health
    ? (health.summary ?? health.title).replace(/\.$/, "")
    : null;
  const moneyLine = money
    ? (money.emotional_valence === "negative" ? "Spending stress elevated — " : "") +
      (money.summary ?? money.title).replace(/\.$/, "")
    : null;
  const lifeLine = life
    ? (life.summary ?? life.title).replace(/\.$/, "")
    : null;

  return {
    health: healthLine ? healthLine.slice(0, 80) : null,
    money:  moneyLine ? moneyLine.slice(0, 80) : null,
    life:   lifeLine ? lifeLine.slice(0, 80) : null,
  };
}

function buildGentleObservations(
  signals: { observation: string; prompt: string }[],
  patterns: { label: string; promptHint: string }[],
): string[] {
  const obs: string[] = [];

  for (const s of signals.slice(0, 2)) {
    const text = s.prompt || s.observation;
    if (text && !obs.includes(text)) obs.push(text);
  }

  for (const p of patterns.slice(0, 1)) {
    const hint = p.promptHint.replace(/^Stress tends to spike around: /, "You seem to do better when ");
    if (hint.length > 20 && hint.length < 120) obs.push(hint);
  }

  return obs.slice(0, 3);
}

/** Assemble full Today intelligence surface. Never throws. */
export async function assembleTodayIntelligence(userId: string): Promise<TodayIntelligence> {
  const date = today();

  const [briefing, memories, tasks, reminders] = await Promise.all([
    generateDailyBriefing(userId),
    getMemoriesForUser(userId, { limit: 60 }),
    getTasksForUser(userId, { status: ["open", "snoozed"], limit: 20 }),
    getRemindersForUser(userId, { status: "pending", limit: 8 }),
  ]);

  const proactive = detectProactiveSignals({ memories, tasks });
  const patterns = synthesizePatterns(memories, 4);

  const focusItems = tasks
    .filter((t) => t.task_type === "hard" || t.due_date === date)
    .slice(0, 5)
    .map((t) => ({
      id:       t.id,
      title:    t.title,
      dueLabel: t.due_date ? (t.due_date === date ? "Today" : t.due_date) : undefined,
      domain:   t.domains[0] ?? "productivity",
    }));

  const overdue = tasks.filter(
    (t) => t.due_date && t.due_date < date && t.status === "open",
  );

  const postponed = tasks
    .filter((t) => t.postpone_count >= 2 && t.status === "open")
    .slice(0, 4);

  const activePriorities = memories
    .filter((m) => m.category === "priorities" || m.category === "recurring_goals")
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 3)
    .map((m) => m.title);

  const themes = patterns.map((p) => ({ id: p.kind, label: p.label }));
  const morningFocusItems = buildMorningFocusItems(tasks, activePriorities, themes, date);

  const healthPatterns = memories
    .filter((m) => m.domains?.includes("health") || m.category === "health_patterns")
    .slice(0, 2)
    .map((m) => m.summary ?? m.title);

  const moneyIndicators = memories
    .filter((m) => m.domains?.includes("money") || m.category === "financial_behaviors")
    .slice(0, 2)
    .map((m) => m.summary ?? m.title);

  const lifeSignals = memories
    .filter(
      (m) =>
        m.domains?.includes("life") ||
        m.category === "recurring_stressors" ||
        m.category === "routines",
    )
    .slice(0, 2)
    .map((m) => m.summary ?? m.title);

  const { weather, label: weatherLabel } = deriveEmotionalWeather({
    emotionalTrend:   briefing.emotionalTrend,
    overloadDetected: proactive.overloadDetected,
    openTaskCount:    tasks.filter((t) => t.status === "open").length,
    overdueCount:     overdue.length,
    memories:         memories.slice(0, 20),
  });

  const suggestedStructure = proactive.overloadDetected
    ? "Light structure — one priority block, then space."
    : "Start with your hardest focus item, then admin.";

  const gentleObservations = buildGentleObservations(proactive.signals, patterns);

  return {
    date,
    morningFocus:         briefing.morningFocus,
    morningFocusItems,
    emotionalTrend:       briefing.emotionalTrend,
    emotionalWeather:     weather,
    emotionalWeatherLabel: weatherLabel,
    focusItems,
    activePriorities,
    healthPatterns,
    moneyIndicators,
    lifeSignals,
    domainSignals:        buildDomainSignals(memories),
    overdueCommitments:   overdue.map((t) => ({
      id: t.id, title: t.title, due_date: t.due_date!,
    })),
    postponedTasks: postponed.map((t) => ({
      id: t.id, title: t.title, postpone_count: t.postpone_count,
    })),
    recurringThemes:      patterns.map((p) => ({
      id: p.kind, label: p.label, strength: p.strength,
    })),
    pendingReminders: reminders.map((r) => ({
      id:        r.id,
      title:     r.title,
      body:      r.body,
      why_shown: r.why_shown,
      gentle:    r.gentle,
      task_id:   r.task_id,
    })),
    gentleObservations,
    proactiveObservations: proactive.signals.map((s) => ({
      kind:        s.kind,
      observation: s.observation,
      prompt:      s.prompt,
    })),
    suggestedStructure,
    overloadDetected:     proactive.overloadDetected,
    generatedAt:          new Date().toISOString(),
  };
}
