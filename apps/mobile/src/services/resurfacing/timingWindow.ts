/**
 * Meridian Resurfacing — Timing Window Logic
 *
 * Answers: "Is NOW a good moment to surface this item?"
 *
 * Two concerns handled here:
 * 1. DueWindow derivation — convert a raw timing label into a structured DueWindow
 * 2. ResurfacingTimingWindow — given the current hour, what is the optimal window for this item?
 *
 * Design principles:
 * - Family logistics surface in their prep window (afternoon for evening pickups)
 * - Financial items surface during low-stress hours (not peak evening)
 * - Prep-chain items (board prep) surface 24–48h before the linked event
 * - Items with no timing surface during calm moments, not urgent windows
 */

import type { ParsedField, TimingHint } from '@/types/capture';
import type { DueWindow } from '@/services/priority/types';
import type { ResurfacingTimingWindow } from './types';

// ── DueWindow derivation from timing label ────────────────────────────────────

const DAY_INDEX: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

/**
 * Maps a raw timing label string to a structured DueWindow.
 * Conservative by default — prefers TODAY over OVERDUE when ambiguous.
 */
export function deriveDueWindow(
  timing: ParsedField<TimingHint> | null,
): DueWindow {
  if (!timing) return 'LATER';

  const label = timing.value.label.toLowerCase();

  // Explicit "now" signals
  if (label.includes('now') || label.includes('right now') || label.includes('in an hour')) {
    return 'NOW';
  }

  // Today variants
  if (
    label.includes('today') ||
    label.includes('tonight') ||
    label.includes('this morning') ||
    label.includes('this afternoon') ||
    label.includes('this evening')
  ) {
    return 'TODAY';
  }

  // Tomorrow
  if (label.includes('tomorrow')) {
    return 'TOMORROW';
  }

  // Day name → calculate days until
  for (const [day, idx] of Object.entries(DAY_INDEX)) {
    if (label.includes(day)) {
      const today = new Date().getDay();
      // rawDays === 0 means same-day capture; treat as TODAY, not next week.
      const rawDays = (idx - today + 7) % 7;
      if (rawDays === 0) return 'TODAY';
      if (rawDays === 1) return 'TOMORROW';
      return 'THIS_WEEK';
    }
  }

  // Relative "in X days/weeks"
  const inMatch = label.match(/in (\d+)\s+(day|week)/);
  if (inMatch) {
    const n = parseInt(inMatch[1]);
    const unit = inMatch[2];
    if (unit === 'day') {
      if (n <= 0) return 'NOW';
      if (n <= 1) return 'TODAY';
      if (n <= 2) return 'TOMORROW';
      if (n <= 7) return 'THIS_WEEK';
    }
    if (unit === 'week') {
      if (n <= 1) return 'THIS_WEEK';
    }
    return 'LATER';
  }

  // "By end of week/month"
  if (label.includes('this week') || label.includes('end of week') || label.includes('by end')) {
    return 'THIS_WEEK';
  }

  if (label.includes('next week') || label.includes('next month')) {
    return 'LATER';
  }

  // Standalone time only ("at 3pm", "by 5") → assume today
  if (label.match(/\bat\s+\d/) || label.match(/\bby\s+\d/)) {
    return 'TODAY';
  }

  return 'LATER';
}

// ── Resurfacing timing window ─────────────────────────────────────────────────

type TimingWindowInput = {
  dueWindow: DueWindow;
  currentHour: number;     // 0–23
  isFamilyCommitment: boolean;
  isFinancial: boolean;
  isStressPrevention: boolean;
  hasPeople: boolean;
  /** Child logistics due early tomorrow — prep opens ~9pm the night before */
  isChildMorningCommitment?: boolean;
  /** How many hours since this item was created */
  ageHours: number;
};

/**
 * Returns the resurfacing timing window for a single item.
 *
 * Key insight: "When would remembering this feel most relieving?"
 *
 * - Evening pickups: prep window is afternoon (14–17h), not 4:59 PM
 * - Board prep: window opens 24h before, peaks the day before
 * - Financial: surfaces during calm hours, avoids peak evening
 * - No timing: surfaces in low-pressure windows only
 */
export function getTimingWindow(input: TimingWindowInput): ResurfacingTimingWindow {
  const {
    dueWindow,
    currentHour,
    isFamilyCommitment,
    isFinancial,
    isStressPrevention,
    ageHours,
    isChildMorningCommitment = false,
  } = input;

  // Already overdue
  if (dueWindow === 'OVERDUE') return 'overdue';

  // NOW window
  if (dueWindow === 'NOW') return 'now';

  // TODAY items
  if (dueWindow === 'TODAY') {
    if (isChildMorningCommitment && currentHour >= 18) return 'prep';
    // Family commitment + afternoon → optimal prep window
    if (isFamilyCommitment && currentHour >= 14 && currentHour <= 17) return 'prep';
    // General today items in morning/afternoon
    if (currentHour >= 7 && currentHour <= 18) return 'today';
    // Evening (18+) — if it's TODAY and we're in evening, it's urgent
    if (currentHour > 18) return 'now';
    return 'today';
  }

  // TOMORROW items
  if (dueWindow === 'TOMORROW') {
    // Child morning commitment — evening before (9pm+) is the primary prep window
    if (isChildMorningCommitment && currentHour >= 21) return 'prep';
    if (isChildMorningCommitment && currentHour >= 18) return 'prep';
    // Family logistics due tomorrow — afternoon today is the prep window
    if (isFamilyCommitment && currentHour >= 13 && currentHour <= 18) return 'prep';
    // Stress-prevention items surface in prep even outside standard hours
    if (isStressPrevention) return 'prep';
    // Evening → still a good prep window for tomorrow
    if (currentHour >= 7 && currentHour <= 22) return 'prep';
    return 'today'; // fallback — still worth surfacing
  }

  // THIS_WEEK items
  if (dueWindow === 'THIS_WEEK') {
    // Stress-prevention items: widen the surfacing window beyond financial-only
    if (isStressPrevention && currentHour >= 7 && currentHour <= 21) return 'low-pressure';
    // Financial in morning → good low-stress moment
    if (isFinancial && currentHour >= 8 && currentHour <= 12) return 'low-pressure';
    // Older items (captured > 24h ago) → time to resurface
    if (ageHours > 24 && currentHour >= 8 && currentHour <= 20) return 'low-pressure';
    return 'later';
  }

  // LATER or no timing
  if (ageHours > 48 && currentHour >= 8 && currentHour <= 12) {
    // Item has been sitting for 2+ days → surface during calm morning
    return 'low-pressure';
  }

  return 'later';
}

// ── Timing score from window ──────────────────────────────────────────────────

/**
 * Converts a ResurfacingTimingWindow to a numeric multiplier (0–1).
 * Used to weight the final resurfacing score.
 */
export const TIMING_WINDOW_SCORE: Record<ResurfacingTimingWindow, number> = {
  overdue:       0.95,
  now:           1.00,
  prep:          0.80,
  today:         0.65,
  'low-pressure': 0.45,
  later:         0.20,
};
