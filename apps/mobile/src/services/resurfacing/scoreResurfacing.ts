/**
 * Meridian Resurfacing — Combined Score
 *
 * Produces a single resurfacing score (0–1) that combines:
 *
 * 1. Priority score — how important is this item?
 *    Uses the existing priority scorer (emotionally-weighted, people-aware).
 *
 * 2. Timing window score — is NOW the right moment to show it?
 *    Computed from current hour, item's due window, prep windows.
 *
 * 3. Cooldown penalty — has this been shown too recently?
 *    Prevents repetitive resurfacing and emotional fatigue.
 *
 * 4. Context group bonus — items in the same contextual cluster
 *    get a small lift when their cluster-mate is already surfacing.
 *
 * Final score = (normalizedPriority * timingMultiplier) - cooldownPenalty + groupBonus
 */

import type { FocusItemData, OverloadState } from '@/services/priority/types';
import { scoreItem } from '@/services/priority/scoreItem';
import type { CooldownEntry, ResurfacingTimingWindow } from './types';
import { TIMING_WINDOW_SCORE } from './timingWindow';

// ── Score normalization ───────────────────────────────────────────────────────

// Approximate max priority total from scoreItem (sum of max weights + context bonuses)
// Used to normalize priority score to 0–1 range
const PRIORITY_SCORE_MAX = 250;

// ── Cooldown penalty ─────────────────────────────────────────────────────────

type CooldownPenalty = {
  penalty: number;      // 0–1 subtracted from score
  isSuppressed: boolean; // true = skip this item entirely
};

export function computeCooldownPenalty(
  itemId: string,
  cooldowns: Record<string, CooldownEntry>,
): CooldownPenalty {
  const entry = cooldowns[itemId];
  if (!entry) return { penalty: 0, isSuppressed: false };

  const hoursAgo = (Date.now() - entry.lastSurfacedAt) / (1000 * 60 * 60);

  // Hard suppress only after explicit defer/snooze — not from automatic markSurfaced
  if (hoursAgo < 0.5 && entry.deferCount > 0) {
    return { penalty: 1, isSuppressed: true };
  }

  let penalty = 0;

  // Recency penalty (decays over time)
  if (hoursAgo < 1)       penalty += 0.50;
  else if (hoursAgo < 3)  penalty += 0.30;
  else if (hoursAgo < 8)  penalty += 0.15;
  else if (hoursAgo < 24) penalty += 0.05;

  // Deferral penalty (compounds with each deliberate deferral)
  // Each deferral adds 0.1 penalty, up to max 0.40
  const deferPenalty = Math.min(0.40, entry.deferCount * 0.10);
  penalty += deferPenalty;

  return { penalty: Math.min(0.95, penalty), isSuppressed: false };
}

// ── Context group bonus ───────────────────────────────────────────────────────

/**
 * If an item shares a relatedContext label with another item that has a
 * high resurfacing score, give it a small lift to keep related items adjacent.
 */
export function computeGroupBonus(
  itemId: string,
  allItemContexts: Map<string, string[]>,
  topItemIds: Set<string>,
): number {
  const itemContexts = allItemContexts.get(itemId) ?? [];
  if (itemContexts.length === 0) return 0;

  // Check if any top-scored item shares a context label with this item
  for (const [otherId, otherContexts] of allItemContexts) {
    if (otherId === itemId || !topItemIds.has(otherId)) continue;
    const shared = itemContexts.some((c) => otherContexts.includes(c));
    if (shared) return 0.08; // small but meaningful cluster lift
  }

  return 0;
}

// ── Reappearance hint ─────────────────────────────────────────────────────────

const REAPPEARANCE_HINTS: Record<ResurfacingTimingWindow, string | null> = {
  overdue:        null, // card speaks for itself
  now:            null, // urgency is self-evident
  prep:           'You have a window for this before it gets tight.',
  today:          null,
  'low-pressure': 'You have breathing room for this.',
  later:          null,
};

export function getReappearanceHint(
  window: ResurfacingTimingWindow,
  wasDeferred: boolean,
  ageHours: number,
): string | null {
  if (wasDeferred && ageHours > 12) {
    return 'Small step now may protect later.';
  }
  return REAPPEARANCE_HINTS[window];
}

// ── Main scorer ───────────────────────────────────────────────────────────────

export type ScoringInput = {
  item: FocusItemData;
  timingWindow: ResurfacingTimingWindow;
  cooldowns: Record<string, CooldownEntry>;
  overloadState: OverloadState;
  ageHours: number;
};

export type ScoringOutput = {
  resurfacingScore: number;
  isSuppressed: boolean;
  reappearanceHint: string | null;
};

export function scoreForResurfacing(input: ScoringInput): ScoringOutput {
  const { item, timingWindow, cooldowns, overloadState, ageHours } = input;

  // Step 1: Priority score (how important)
  const scored = scoreItem(item, overloadState);
  const normalizedPriority = Math.min(1, scored.priorityScore.total / PRIORITY_SCORE_MAX);

  // Step 2: Timing window (is now the right moment)
  const timingMultiplier = TIMING_WINDOW_SCORE[timingWindow];

  // Step 3: Cooldown
  const { penalty, isSuppressed } = computeCooldownPenalty(item.id, cooldowns);
  if (isSuppressed) {
    return { resurfacingScore: 0, isSuppressed: true, reappearanceHint: null };
  }

  // Step 4: Combined score
  const base = normalizedPriority * timingMultiplier;
  const finalScore = Math.max(0, Math.min(1, base - penalty));

  // Step 5: Reappearance hint
  const wasDeferred = (cooldowns[item.id]?.deferCount ?? 0) > 0;
  const reappearanceHint = getReappearanceHint(timingWindow, wasDeferred, ageHours);

  return {
    resurfacingScore: finalScore,
    isSuppressed: false,
    reappearanceHint,
  };
}
