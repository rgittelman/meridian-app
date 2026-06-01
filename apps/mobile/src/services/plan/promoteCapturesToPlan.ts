import type { LifeObject } from '@/types/capture';
import type { PromotedPlanItem, PromotedPlanItemStatus } from '@/types/plan';
import { assignDomainFromCapture } from '@/services/life/assignDomain';
import { personLabelForCapture } from '@/utils/parsing/personForDisplay';
import { isKnownPersonName } from '@/services/people/knownPeople';
import { humanizePlanTitle } from './humanizePlanTitle';
import {
  logPlanPromotionDeduped,
  logPlanPromotionDiagnostic,
  logPlanPromotionScheduled,
  type PlanPromotionDiagnostic,
} from './planDebug';
import {
  evaluatePromotionEligibility,
  resolveCapturePlanTime,
} from './resolveCapturePlanTime';
import { planFocusScoreBoost } from './planFocusBoost';

function inferredPeopleFromCapture(item: LifeObject): string[] {
  return item.parse.people
    .filter((p) => p.confidence !== 'low' && isKnownPersonName(p.value))
    .map((p) => p.value);
}

/** One LifeObject per capture id — store must not promote duplicates. */
function uniqueCapturesById(items: LifeObject[]): LifeObject[] {
  const byId = new Map<string, LifeObject>();
  for (const item of items) {
    if (!byId.has(item.id)) {
      byId.set(item.id, item);
    }
  }
  return Array.from(byId.values());
}

function promotionSortScore(entry: PromotedPlanItem): number {
  const confidenceRank = entry.timingConfidence === 'high' ? 2 : 1;
  const exactRank = entry.isApproximate ? 0 : 2;
  return confidenceRank + exactRank;
}

function upsertBySourceCaptureId(
  bySourceId: Map<string, PromotedPlanItem>,
  candidate: PromotedPlanItem,
): void {
  const key = candidate.sourceCaptureId;
  const existing = bySourceId.get(key);
  if (!existing) {
    bySourceId.set(key, candidate);
    return;
  }

  if (promotionSortScore(candidate) > promotionSortScore(existing)) {
    bySourceId.set(key, candidate);
    logPlanPromotionDeduped(key, 'replaced_weaker_duplicate');
  } else {
    logPlanPromotionDeduped(key, 'skipped_duplicate_source');
  }
}

/**
 * Selects captures that qualify for soft Plan surfacing and resolves schedule times.
 * Timing confidence from item.parse.timing.confidence; schedule from timing.value.label.
 * Each sourceCaptureId yields at most one promoted Plan item.
 */
export function promoteCapturesToPlan(
  items: LifeObject[],
  reference = new Date(),
  statusByCaptureId: Record<string, PromotedPlanItemStatus> = {},
): PromotedPlanItem[] {
  const bySourceId = new Map<string, PromotedPlanItem>();
  const uniqueItems = uniqueCapturesById(items);

  for (const item of uniqueItems) {
    const eligibility = evaluatePromotionEligibility(item, reference);
    const assigned = assignDomainFromCapture(item);
    logPlanPromotionDiagnostic(
      buildPlanPromotionDiagnostic(item, eligibility, assigned.domainId, reference),
    );
    if (!eligibility.eligible) continue;

    const resolved = resolveCapturePlanTime(item, reference);
    if (!resolved) continue;

    const status = statusByCaptureId[item.id] ?? 'active';
    if (status === 'handled' || status === 'dismissed') continue;

    const timing = item.parse.timing!;

    const candidate: PromotedPlanItem = {
      id: item.id,
      sourceCaptureId: item.id,
      title: humanizePlanTitle(item),
      originalText: item.raw,
      plannedStartTime: resolved.startTime,
      plannedEndTime: null,
      inferredPeople: inferredPeopleFromCapture(item),
      inferredDomain: assigned.domainId,
      timingConfidence: timing.confidence,
      promotionReason: eligibility.reason,
      sourceType: 'capture',
      status,
      displayTime: resolved.displayTime,
      timingLabel: timing.value.label,
      isApproximate: resolved.isApproximate,
      personLabel: personLabelForCapture(item),
      location: item.parse.location?.value ?? null,
    };

    logPlanPromotionScheduled(
      item.id,
      resolved.startTime.toISOString(),
      eligibility.reason,
    );

    upsertBySourceCaptureId(bySourceId, candidate);
  }

  return Array.from(bySourceId.values()).sort(
    (a, b) => a.plannedStartTime.getTime() - b.plannedStartTime.getTime(),
  );
}

function buildPlanPromotionDiagnostic(
  item: LifeObject,
  eligibility: ReturnType<typeof evaluatePromotionEligibility>,
  inferredDomain: PromotedPlanItem['inferredDomain'],
  reference: Date,
): PlanPromotionDiagnostic {
  const resolved = resolveCapturePlanTime(item, reference);
  const timing = item.parse.timing;
  const focusBoost = planFocusScoreBoost(item, 'active', reference);
  const inferredPeople = item.parse.people
    .filter((p) => p.confidence !== 'low' && isKnownPersonName(p.value))
    .map((p) => p.value);

  return {
    captureId: item.id,
    parsedDate: resolved ? resolved.startTime.toISOString().slice(0, 10) : null,
    parsedTime: resolved?.displayTime ?? null,
    parsedLocation: item.parse.location?.value ?? null,
    inferredPeople,
    inferredDomain,
    promotionEligible: eligibility.eligible,
    promotionRejectionReason: eligibility.rejectionReason ?? null,
    rejectionReason: eligibility.rejectionReason,
    timingLabel: timing?.value.label ?? null,
    timingConfidence: timing?.confidence ?? 'none',
    eligibilityReason: eligibility.reason,
    promotedBecause: eligibility.promotedBecause ?? null,
    exactDayDetected: eligibility.signals.exactDayDetected,
    exactClockDetected: eligibility.signals.exactClockDetected,
    dayOnlyDetected: eligibility.signals.dayOnlyDetected,
    meaningfulDomainSignal: eligibility.signals.meaningfulDomainSignal,
    actionableIntentDetected: eligibility.signals.actionableIntentDetected,
    propagatedToPlan: eligibility.eligible && resolved !== null,
    propagatedToLife:
      item.status !== 'done' &&
      item.status !== 'archived',
    propagatedToFocus: focusBoost > 0,
  };
}

