/**
 * Meridian Orchestration — Overload Detection
 *
 * Infers the user's current mental bandwidth state from the active item set.
 * Returns an OverloadState without exposing scores, percentages, or metrics.
 *
 * Design: Conservative. The default is MEDIUM — we don't assume the user
 * is overwhelmed unless there are clear, compounding signals.
 *
 * Factors:
 * - Multiple items due NOW or TODAY (timing collision)
 * - High emotional weight accumulation
 * - People-linked item stacking (interpersonal obligations compound)
 * - Financial items in an already dense stack
 * - Late evening with unresolved prep chains
 * - Total active item count
 */

import type { OverloadState } from '@/services/priority/types';
import type { ResurfacedItem } from '@/services/resurfacing/types';

export type OverloadFactors = {
  timingCollision: boolean;
  emotionalStacking: boolean;
  peopleStacking: boolean;
  financialPressure: boolean;
  prepChainUnresolved: boolean;
  lateEveningCompression: boolean;
  itemCount: number;
};

export type OverloadAssessment = {
  state: OverloadState;
  factors: OverloadFactors;
  /** 0–10 internal score (never exposed to user) */
  _score: number;
};

export function detectOverload(
  items: ResurfacedItem[],
  currentHour: number,
): OverloadAssessment {
  let score = 0;

  // Timing collision: 2+ items due now or today
  const urgentCount = items.filter(
    (i) => i.timingWindow === 'now' || i.timingWindow === 'today',
  ).length;
  const timingCollision = urgentCount >= 2;
  if (timingCollision) score += urgentCount >= 3 ? 3 : 2;

  // Emotional stacking: 2+ warm urgency items
  const warmCount = items.filter((i) => i.visualUrgency === 'warm').length;
  const emotionalStacking = warmCount >= 2;
  if (emotionalStacking) score += 2;

  // People stacking: 3+ items with linked people
  const peopleCount = items.filter((i) => Boolean(i.person)).length;
  const peopleStacking = peopleCount >= 3;
  if (peopleStacking) score += 1.5;

  // Financial pressure: deferred — ResurfacedItem carries no domain field, so
  // true financial detection is not possible here yet. The boolean is preserved
  // in OverloadFactors for future use once domain flows through the resurfacing
  // pipeline. Score contribution is intentionally zeroed until then.
  // DO NOT substitute visualUrgency === 'warm' — that is emotionalStacking's signal.
  const financialPressure = false;

  // Unresolved prep chains: items with groups (related context clusters)
  const prepChainCount = items.filter((i) => i.group !== null).length;
  const prepChainUnresolved = prepChainCount >= 2;
  if (prepChainUnresolved) score += 1;

  // Late evening (after 7 PM) with urgent items
  const isLateEvening = currentHour >= 19;
  const lateEveningCompression = isLateEvening && urgentCount >= 1;
  if (lateEveningCompression) score += 1.5;

  // Raw item count
  if (items.length >= 5) score += 1;
  if (items.length >= 7) score += 1;

  const factors: OverloadFactors = {
    timingCollision,
    emotionalStacking,
    peopleStacking,
    financialPressure,
    prepChainUnresolved,
    lateEveningCompression,
    itemCount: items.length,
  };

  const state: OverloadState =
    score >= 7 ? 'HIGH' : score >= 4 ? 'MEDIUM' : 'LOW';

  return { state, factors, _score: score };
}
