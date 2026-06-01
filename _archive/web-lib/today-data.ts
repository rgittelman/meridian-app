/**
 * Today Data Layer — Phase 1
 *
 * Single source of truth for the Today page.
 * Currently reads from data/today.json.
 *
 * Designed to be a drop-in replacement for a Supabase query,
 * Google Calendar API call, or any future data source — just
 * swap the getTodayData() implementation without touching the page.
 */

import path from "path";
import fs   from "fs";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TodayUser {
  name:     string;
  timezone: string;
}

export interface Priority {
  id:            string;
  text:          string;
  done:          boolean;
  tag?:          string;
  scheduledTime?: string;
  /** 0–1 completion fraction */
  progress?:     number;
}

export type EventCategory = "work" | "social" | "health" | "personal";

export interface CalendarEvent {
  id:          string;
  time:        string;
  title:       string;
  color:       string;
  durationMin: number;
  category?:   EventCategory;
}

export interface FocusData {
  deepWorkMinutes: number;
  targetMinutes:   number;
  /** 0–1 */
  onTrackPct:      number;
  nextBlockTime?:  string;
  sessionsToday:   number;
}

export interface ContextSignals {
  energyLevel:    string;
  calendarLoad:   "light" | "moderate" | "heavy";
  focusTrend:     string;
  recoveryStatus: string;
  focusWindow?:   string;
}

export interface TodayData {
  user:       TodayUser;
  priorities: Priority[];
  events:     CalendarEvent[];
  focus:      FocusData;
  context:    ContextSignals;
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

/**
 * Returns today's data.
 *
 * Phase 1: reads from data/today.json (instant, no network).
 * Phase 2: replace with Supabase query + Google Calendar fetch.
 */
export async function getTodayData(): Promise<TodayData> {
  const filePath = path.join(process.cwd(), "data", "today.json");
  const raw      = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as TodayData;
}

// ─── Derived helpers ──────────────────────────────────────────────────────────

/** Parse "H:MM AM/PM" → minutes from midnight */
export function parseEventTime(time: string): number {
  const [hhmm, period] = time.split(" ");
  let [h, m]           = hhmm.split(":").map(Number);
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h  = 0;
  return h * 60 + m;
}

export type EventStatus = "past" | "now" | "upcoming";

export function getEventStatus(
  time:        string,
  durationMin: number,
): EventStatus {
  const start  = parseEventTime(time);
  const end    = start + durationMin;
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  if (nowMin >= start && nowMin < end) return "now";
  if (nowMin >= end)                   return "past";
  return "upcoming";
}

/** Format minutes → "Xh Ym" or "Xm" */
export function formatMinutes(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
