import type { Confidence, LifeObject } from '@/types/capture';
import type { LifeDomainId } from '@/types/life';
import { assignDomainFromCapture } from '@/services/life/assignCaptureDomain';
import { humanizePlanTitle } from '@/services/plan/humanizePlanTitle';
import { planFocusScoreBoost } from '@/services/plan/planFocusBoost';
import {
  evaluatePromotionEligibility,
  resolveCapturePlanTime,
} from '@/services/plan/resolveCapturePlanTime';
import type {
  PromotedBecause,
  PromotionRejectionReason,
} from '@/services/plan/promotionEligibilitySignals';
import { parseCapture } from '@/utils/parsing';
import { isKnownPersonName } from '@/services/people/knownPeople';
import { isDevEnvironment } from '@/utils/isDev';

export type CaptureIntelligenceAudit = {
  captureId: string;
  raw: string;
  savedInCapture: boolean;
  planTitle: string;
  parsedDate: string | null;
  parsedTime: string | null;
  parsedLocation: string | null;
  inferredPeople: string[];
  inferredDomain: LifeDomainId;
  domainReason: string;
  timingConfidence: Confidence | 'none';
  timingLabel: string | null;
  promotionEligible: boolean;
  promotionRejectionReason: string | null;
  eligibilityReason: string | null;
  propagatedToPlan: boolean;
  propagatedToLife: boolean;
  propagatedToFocus: boolean;
  focusBoost: number;
  hoursUntilStart: number | null;
  createsCalendarEvent: false;
  // ── Promotion diagnostics ──────────────────────────────────────────────────
  promotedBecause: string | null;
  exactDayDetected: boolean;
  exactClockDetected: boolean;
  dayOnlyDetected: boolean;
  meaningfulDomainSignal: boolean;
  actionableIntentDetected: boolean;
};

/** Pure audit — safe for Node tests (no calendar store / React Native). */
export function auditCaptureIntelligence(
  item: LifeObject,
  reference = new Date(),
): CaptureIntelligenceAudit {
  const eligibility = evaluatePromotionEligibility(item, reference);
  const resolved = resolveCapturePlanTime(item, reference);
  const domain = assignDomainFromCapture(item);
  const focusBoost = planFocusScoreBoost(item, 'active', reference);

  const inferredPeople = item.parse.people
    .filter((p) => p.confidence !== 'low' && isKnownPersonName(p.value))
    .map((p) => p.value);

  const hoursUntilStart = resolved
    ? (resolved.startTime.getTime() - reference.getTime()) / 3_600_000
    : null;

  const activeCapture =
    item.status !== 'done' && item.status !== 'archived';

  return {
    captureId: item.id,
    raw: item.raw,
    savedInCapture: true,
    planTitle: humanizePlanTitle(item),
    parsedDate: resolved ? resolved.startTime.toISOString().slice(0, 10) : null,
    parsedTime: resolved?.displayTime ?? null,
    parsedLocation: item.parse.location?.value ?? null,
    inferredPeople,
    inferredDomain: domain.domainId,
    domainReason: domain.reason,
    timingConfidence: item.parse.timing?.confidence ?? 'none',
    timingLabel: item.parse.timing?.value.label ?? null,
    promotionEligible: eligibility.eligible,
    promotionRejectionReason: eligibility.rejectionReason ?? null,
    eligibilityReason: eligibility.reason,
    promotedBecause: eligibility.promotedBecause ?? null,
    exactDayDetected: eligibility.signals.exactDayDetected,
    exactClockDetected: eligibility.signals.exactClockDetected,
    dayOnlyDetected: eligibility.signals.dayOnlyDetected,
    meaningfulDomainSignal: eligibility.signals.meaningfulDomainSignal,
    actionableIntentDetected: eligibility.signals.actionableIntentDetected,
    propagatedToPlan: eligibility.eligible && resolved !== null,
    propagatedToLife: activeCapture,
    propagatedToFocus: focusBoost > 0,
    focusBoost,
    hoursUntilStart,
    createsCalendarEvent: false,
  };
}

export function auditRawCaptureText(
  raw: string,
  reference = new Date(),
  id = 'qa-fixture',
): CaptureIntelligenceAudit {
  const parse = parseCapture(raw.trim());
  const item: LifeObject = {
    id,
    raw: raw.trim(),
    title: raw.trim(),
    objectType: 'task',
    createdAt: reference,
    status: 'captured',
    parse,
    momentumValue: 0.5,
    recurrence: null,
  };
  return auditCaptureIntelligence(item, reference);
}

/** Re-parse stored capture after parser upgrades (never creates calendar events). */
export function refreshCaptureParse(item: LifeObject): LifeObject {
  const parse = parseCapture(item.raw);
  return { ...item, parse };
}

export function logCaptureIntelligenceAudit(audit: CaptureIntelligenceAudit): void {
  if (!isDevEnvironment()) return;
  console.log(`[Meridian:capture-qa] ${audit.captureId}`, audit);
}

export function logCaptureIntelligenceAudits(audits: CaptureIntelligenceAudit[]): void {
  if (!isDevEnvironment()) return;
  console.log(`[Meridian:capture-qa] batch=${audits.length}`, audits);
}
