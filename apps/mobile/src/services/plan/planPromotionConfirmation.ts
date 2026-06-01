import type { CaptureConfirmationMessage, LifeObject } from '@/types/capture';
import {
  evaluatePromotionEligibility,
  resolveCapturePlanTime,
  type ResolvedCapturePlanTime,
} from './resolveCapturePlanTime';

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatPlacementDay(start: Date, reference: Date): string {
  const day = startOfDay(start);
  const today = startOfDay(reference);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (day.getTime() === today.getTime()) return 'today';
  if (day.getTime() === tomorrow.getTime()) return 'tomorrow';

  return start.toLocaleDateString(undefined, { weekday: 'long' });
}

/**
 * Calm capture feedback when a timed capture lands on Plan.
 * Never implies calendar sync or external event creation.
 */
export function planPromotionConfirmationMessage(
  item: LifeObject,
  reference = new Date(),
): CaptureConfirmationMessage | null {
  if (!evaluatePromotionEligibility(item, reference).eligible) return null;

  const resolved = resolveCapturePlanTime(item, reference);
  if (!resolved) return null;

  const confidence = item.parse.timing?.confidence;
  return formatPlanPlacementFeedback(resolved, reference, confidence);
}

export function formatPlanPlacementFeedback(
  resolved: ResolvedCapturePlanTime,
  reference = new Date(),
  timingConfidence?: 'high' | 'medium' | 'low',
): CaptureConfirmationMessage {
  const dayLabel = formatPlacementDay(resolved.startTime, reference);

  if (timingConfidence === 'medium' || resolved.placementTier === 'soft_day') {
    if (dayLabel === 'today') return 'Added to your plan for today.';
    if (dayLabel === 'tomorrow') return 'Added to your plan for tomorrow.';
    return `Placed on your plan for ${dayLabel}.`;
  }

  const time = resolved.displayTime.replace(/^~/, 'around ');

  if (dayLabel === 'today') {
    return `Added to today at ${time}.`;
  }
  if (dayLabel === 'tomorrow') {
    return `Added to tomorrow at ${time}.`;
  }

  return `Placed on your plan for ${dayLabel} at ${time}.`;
}
