/**
 * Meridian Resurfacing — Insight Generator
 *
 * Produces a single ambient sentence that reflects the emotional texture
 * of the current resurfaced items.
 *
 * Design rules:
 * - Extremely restrained — most of the time, return null
 * - Never motivational or pressure-oriented
 * - Never assistant-like or chatty
 * - Calm, factual, slightly warm
 * - Should feel like a quiet observation, not a directive
 * - Never generate the same insight twice in a row
 *
 * Generation conditions:
 * - Only when there are 2+ items
 * - Only during certain time windows (morning or early evening)
 * - Only when the pattern is genuinely worth noting
 */

import type { ResurfacedItem } from './types';

type InsightContext = {
  items: ResurfacedItem[];
  currentHour: number;
  /** Suppress if this insight was generated recently */
  lastInsight: string | null;
};

/** Calm observation candidates — indexed by pattern key */
const INSIGHT_CANDIDATES: Record<string, string[]> = {
  family_evening_timing: [
    'Tonight is mostly family logistics — one at a time.',
    'A few timing-sensitive things this evening.',
  ],
  prep_window_open: [
    'A good window to handle tomorrow before it arrives.',
    'Handling one prep item now protects tomorrow morning.',
  ],
  financial_calm: [
    'You have breathing room for the financial item today.',
  ],
  family_and_work: [
    'The most important things today are personal, not professional.',
  ],
  low_pressure_morning: [
    'A relatively light day — good moment for the quieter items.',
  ],
  mixed_timing: [
    'A few things are timing-sensitive. The rest can wait.',
  ],
};

function pickCandidate(key: string, exclude: string | null): string | null {
  const options = INSIGHT_CANDIDATES[key];
  if (!options) return null;
  const filtered = exclude ? options.filter((o) => o !== exclude) : options;
  if (filtered.length === 0) return null;
  // Deterministic pick — random selection caused insight churn and store update loops
  return filtered[0];
}

/**
 * Returns a single ambient insight sentence, or null.
 *
 * Frequency is naturally restrained by strict pattern matching —
 * the default is silence.
 */
export function generateInsight(ctx: InsightContext): string | null {
  const { items, currentHour, lastInsight } = ctx;

  if (items.length < 2) return null;

  // Only generate during productive windows (morning or early evening)
  const isMorning = currentHour >= 7 && currentHour <= 10;
  const isEarlyEvening = currentHour >= 16 && currentHour <= 19;
  if (!isMorning && !isEarlyEvening) return null;

  const hasFamily = items.some(
    (i) => i.visualUrgency === 'time' || i.person !== undefined,
  );
  const hasTiming = items.some(
    (i) => i.timingWindow === 'now' || i.timingWindow === 'today' || i.timingWindow === 'prep',
  );
  const hasFinancial = items.some((i) => i.reappearanceHint !== null);
  const hasLowPressure = items.every(
    (i) => i.timingWindow === 'low-pressure' || i.timingWindow === 'later',
  );

  // Pattern: family + evening timing
  if (hasFamily && hasTiming && isEarlyEvening) {
    return pickCandidate('family_evening_timing', lastInsight);
  }

  // Pattern: prep window is open (morning planning)
  if (hasTiming && isMorning && items.some((i) => i.timingWindow === 'prep')) {
    return pickCandidate('prep_window_open', lastInsight);
  }

  // Pattern: financial in a calm window
  if (hasFinancial && isMorning) {
    return pickCandidate('financial_calm', lastInsight);
  }

  // Pattern: all items are low-pressure
  if (hasLowPressure && isMorning) {
    return pickCandidate('low_pressure_morning', lastInsight);
  }

  // Pattern: mixed timing — some urgent, some not
  if (hasTiming && items.length >= 3) {
    return pickCandidate('mixed_timing', lastInsight);
  }

  return null;
}
