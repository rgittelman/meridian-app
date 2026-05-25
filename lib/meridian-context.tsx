"use client";

/**
 * Meridian System Context
 *
 * A lightweight shared context layer that holds the user's current life state.
 * All values are currently mock/demo data — structured to be easily replaced
 * with real Supabase or API data in the future.
 *
 * Consumed by:
 *   - AmbientBar (above every Ask Meridian composer)
 *   - ContextInsight (Today page focus window)
 *   - Chat page system status line
 */

import { createContext, useContext, type ReactNode } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EnergyLevel  = "high" | "medium" | "low";
export type MemoryStatus = "active" | "learning" | "syncing";
export type CalendarLoad = "light" | "moderate" | "heavy";
export type DayPhase     = "morning" | "afternoon" | "evening";

export interface SystemContext {
  /** Whether focus mode is currently active */
  focusMode:      boolean;
  /** Subjective or inferred energy level for the day */
  energy:         EnergyLevel;
  /** Number of open, high-priority items */
  priorities:     number;
  /** Number of unfinished tasks today */
  tasks:          number;
  /** Memory / learning status */
  memoryStatus:   MemoryStatus;
  /** How dense the calendar is today */
  calendarLoad:   CalendarLoad;
  /** Best available focus window, e.g. "10:30 – 12:00" */
  focusWindow:    string | null;
  /** Current phase of day */
  dayPhase:       DayPhase;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deriveDayPhase(): DayPhase {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

/**
 * Returns 1–3 ambient status snippets in priority order.
 * Consumers display these separated by " · ".
 */
export function getAmbientSnippets(ctx: SystemContext): string[] {
  const s: string[] = [];

  if (ctx.memoryStatus === "active")   s.push("Memory active");
  if (ctx.memoryStatus === "learning") s.push("Learning your routines");
  if (ctx.tasks > 0)                   s.push(`${ctx.tasks} unfinished today`);
  if (ctx.focusMode)                   s.push("Focus mode on");
  if (ctx.calendarLoad === "heavy")    s.push("Calendar heavy after 3 PM");
  if (ctx.energy === "low")            s.push("Lower energy today");

  return s.slice(0, 3);
}

/**
 * Returns a single contextual insight for the Today page.
 * Returns null when nothing meaningful is available.
 */
export function getContextualInsight(ctx: SystemContext): string | null {
  if (ctx.focusWindow && ctx.calendarLoad !== "light") {
    return `Best focus window today: ${ctx.focusWindow}`;
  }
  if (ctx.energy === "low") {
    return "Lower energy today — protect your most important hour.";
  }
  if (ctx.tasks > 3) {
    return `${ctx.tasks} things open. Consider narrowing to one.`;
  }
  return null;
}

// ─── Demo data ────────────────────────────────────────────────────────────────
// Replace with real Supabase / API fetch as the app evolves.

const DEMO_CONTEXT: SystemContext = {
  focusMode:    false,
  energy:       "medium",
  priorities:   0,
  tasks:        0,
  memoryStatus: "active",
  calendarLoad: "light",
  focusWindow:  null,
  dayPhase:     deriveDayPhase(),
};

// ─── Provider + hook ──────────────────────────────────────────────────────────

const Ctx = createContext<SystemContext>(DEMO_CONTEXT);

export function MeridianProvider({ children }: { children: ReactNode }) {
  // Future: replace value with state from a data-fetching hook
  return <Ctx.Provider value={DEMO_CONTEXT}>{children}</Ctx.Provider>;
}

export function useMeridian(): SystemContext {
  return useContext(Ctx);
}
