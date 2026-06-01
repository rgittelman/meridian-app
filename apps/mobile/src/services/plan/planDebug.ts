import type { Confidence } from '@/types/capture';
import type { LifeDomainId } from '@/types/life';
import { isDevEnvironment } from '@/utils/isDev';
import type {
  PromotionEligibilitySignals,
  PromotedBecause,
  PromotionRejectionReason,
} from './promotionEligibilitySignals';

export type PlanPromotionDiagnostic = {
  captureId: string;
  parsedDate: string | null;
  parsedTime: string | null;
  parsedLocation: string | null;
  inferredPeople?: string[];
  inferredDomain: LifeDomainId;
  promotionEligible: boolean;
  promotionRejectionReason?: PromotionRejectionReason | null;
  rejectionReason?: PromotionRejectionReason;
  timingLabel: string | null;
  timingConfidence: Confidence | 'none';
  eligibilityReason?: string;
  promotedBecause?: PromotedBecause | null;
  exactDayDetected?: boolean;
  exactClockDetected?: boolean;
  dayOnlyDetected?: boolean;
  meaningfulDomainSignal?: boolean;
  actionableIntentDetected?: boolean;
  propagatedToPlan?: boolean;
  propagatedToLife?: boolean;
  propagatedToFocus?: boolean;
};

export function logPlanPromotionDiagnostic(diag: PlanPromotionDiagnostic): void {
  if (!isDevEnvironment()) return;
  console.log(`[Meridian:plan-promo] audit capture=${diag.captureId}`, diag);
}

export function logPlanPromotionEligibility(
  captureId: string,
  timingConfidence: Confidence | 'none',
  eligible: boolean,
  reason: string,
  signals?: PromotionEligibilitySignals,
  promotedBecause?: PromotedBecause | null,
): void {
  if (!isDevEnvironment()) return;
  console.log(`[Meridian:plan-promo] capture=${captureId}`, {
    timingConfidence,
    eligible,
    reason,
    promotedBecause: promotedBecause ?? null,
    exactDayDetected: signals?.exactDayDetected,
    exactClockDetected: signals?.exactClockDetected,
    dayOnlyDetected: signals?.dayOnlyDetected,
    meaningfulDomainSignal: signals?.meaningfulDomainSignal,
    actionableIntentDetected: signals?.actionableIntentDetected,
    rejectionReason: eligible ? null : reason,
  });
}

export function logPlanMergedCount(
  calendarCount: number,
  promotedCount: number,
  dayKey: string,
): void {
  if (!isDevEnvironment()) return;
  console.log(`[Meridian:plan-merge] day=${dayKey}`, {
    calendar: calendarCount,
    promoted: promotedCount,
    total: calendarCount + promotedCount,
  });
}

export function logPlanPromotionScheduled(
  captureId: string,
  plannedIso: string,
  promotionReason: string,
): void {
  if (!isDevEnvironment()) return;
  console.log(`[Meridian:plan-promo] scheduled capture=${captureId}`, {
    plannedIso,
    promotionReason,
  });
}

export function logPlanPromotionDeduped(
  sourceCaptureId: string,
  action: 'skipped_duplicate_source' | 'replaced_weaker_duplicate' | 'skipped_duplicate_day_row',
): void {
  if (!isDevEnvironment()) return;
  console.log(`[Meridian:plan-promo] dedupe sourceCaptureId=${sourceCaptureId}`, {
    action,
  });
}
