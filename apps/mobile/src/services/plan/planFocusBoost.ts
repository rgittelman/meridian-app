import type { LifeObject } from '@/types/capture';
import type { PromotedPlanItemStatus } from '@/types/plan';
import {
  evaluatePromotionEligibility,
  resolveCapturePlanTime,
} from './resolveCapturePlanTime';

/**
 * Near-term promoted captures get a modest Focus lift — same capture id,
 * never a duplicate card.
 */
export function planFocusScoreBoost(
  item: LifeObject,
  planStatus: PromotedPlanItemStatus = 'active',
  reference = new Date(),
): number {
  if (planStatus !== 'active') return 0;
  if (!evaluatePromotionEligibility(item, reference).eligible) return 0;

  const resolved = resolveCapturePlanTime(item, reference);
  if (!resolved) return 0;

  const hoursUntil = (resolved.startTime.getTime() - reference.getTime()) / 3_600_000;
  if (hoursUntil < 0 || hoursUntil > 48) return 0;

  let boost = 0;
  if (resolved.placementTier === 'soft_day') {
    boost = hoursUntil <= 48 ? 0.05 : 0;
  } else if (hoursUntil <= 12) {
    boost = 0.14;
  } else if (hoursUntil <= 24) {
    boost = 0.1;
  } else {
    boost = 0.06;
  }

  const isFamily =
    item.parse.category?.value === 'family' ||
    item.parse.people.some((p) => p.confidence === 'high');

  if (!isFamily && item.parse.people.length === 0) {
    boost = Math.min(boost, 0.07);
  }

  return boost;
}
