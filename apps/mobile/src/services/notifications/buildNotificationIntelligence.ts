import type { MeridianCalendarEvent } from '@/types/calendar';
import type { LifeObject } from '@/types/capture';
import type {
  NotificationAuditEntry,
  NotificationBundle,
  NotificationCandidate,
  NotificationIntelligenceSnapshot,
  NotificationSuppressionReason,
  ScoredNotificationCandidate,
} from '@/types/notification';
import type { PeopleImpact } from '@/services/priority/types';
import { enrichEventsWithCaptureRelationships } from '@/services/relationships/calendarCaptureIndex';
import { buildPrepIntelligence } from '@/services/prep/buildPrepIntelligence';
import { DEFAULT_NOTIFICATION_DAILY_CAPS } from './constants';
import { computeInterruptionScore } from './interruptionScore';
import {
  evaluateConstitutionalCompliance,
  type ConstitutionalCheckResult,
} from './constitutionalCheck';
import { applyNotificationSuppression } from './suppressionEngine';
import { bundleNotificationCandidates } from './bundlingEngine';
import { applyDailyCaps } from './dailyCaps';
import { generateMorningBriefCandidates } from './generateMorningBrief';
import { generateTransitionAwarenessCandidates } from './generateTransitionAwareness';
import { generateEveningWindDownCandidates } from './generateEveningWindDown';
import { generateCriticalProtectionCandidates } from './generateCriticalProtection';
import { generateLeaveAlertCandidates } from './generateLeaveAlert';
import { generateCaptureReminderCandidates } from './generateCaptureReminders';
import type { NotificationIntelligenceContext } from './types';
import { logNotificationAudit } from './notificationDebug';

export type BuildNotificationIntelligenceInput = {
  events: MeridianCalendarEvent[];
  captures: LifeObject[];
  context: NotificationIntelligenceContext;
  now?: Date;
};

function peopleImpactForEvent(event: MeridianCalendarEvent | null): PeopleImpact {
  if (!event) return 'NONE';
  return event.peopleImpact ?? 'NONE';
}

function pushAudit(
  log: NotificationAuditEntry[],
  entry: Omit<NotificationAuditEntry, 'at'> & { at?: Date },
): void {
  log.push({
    at: entry.at ?? new Date(),
    action: entry.action,
    candidateId: entry.candidateId,
    candidateType: entry.candidateType,
    interruptionReason: entry.interruptionReason,
    suppressionReason: entry.suppressionReason,
    bundleId: entry.bundleId,
    bundleKey: entry.bundleKey,
    decision: entry.decision,
  });
}

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

export type NotificationPipelineDiagnostics = {
  rawGenerated: NotificationCandidate[];
  constitutionalChecks: Record<string, ConstitutionalCheckResult>;
  engineSuppressedById: Map<string, NotificationSuppressionReason>;
  engineEligible: ScoredNotificationCandidate[];
  bundlesBeforeCaps: NotificationBundle[];
  cappedBundleIds: Set<string>;
};

export type NotificationPipelineResult = {
  snapshot: NotificationIntelligenceSnapshot;
  diagnostics: NotificationPipelineDiagnostics;
};

/**
 * Decision engine: SEND or SUPPRESS before any notification is generated for delivery.
 * No push implementation in v1.
 */
export function buildNotificationIntelligence(
  input: BuildNotificationIntelligenceInput,
): NotificationIntelligenceSnapshot {
  return buildNotificationIntelligenceWithDiagnostics(input).snapshot;
}

export function buildNotificationIntelligenceWithDiagnostics(
  input: BuildNotificationIntelligenceInput,
): NotificationPipelineResult {
  const now = input.now ?? new Date();
  const auditLog: NotificationAuditEntry[] = [];
  const ctx = input.context;

  const { events, index } = enrichEventsWithCaptureRelationships(input.events, input.captures);
  const prepSnapshot = buildPrepIntelligence(events, index, now.getTime());
  const prepClusters = prepSnapshot.clusters;

  const raw = [
    ...generateMorningBriefCandidates(events, now),
    ...generateTransitionAwarenessCandidates(events, prepClusters, now),
    ...generateEveningWindDownCandidates(events, now),
    ...generateCriticalProtectionCandidates(events, now),
    ...generateLeaveAlertCandidates(events, now),
    ...generateCaptureReminderCandidates(input.captures, now),
  ];

  for (const c of raw) {
    pushAudit(auditLog, {
      action: 'generated',
      candidateId: c.id,
      candidateType: c.type,
      interruptionReason: c.interruptionReason,
      suppressionReason: null,
      bundleId: null,
      bundleKey: c.bundleKey,
      decision: 'suppress',
    });
  }

  const openedWithinTwoWeeks =
    ctx.lastAppOpenedAt !== null && now.getTime() - ctx.lastAppOpenedAt < TWO_WEEKS_MS;

  const scored: ScoredNotificationCandidate[] = raw.map((candidate) => ({
    ...candidate,
    interruptionScore: computeInterruptionScore(
      candidate,
      peopleImpactForEvent(
        candidate.sourceEventId
          ? events.find((e) => e.id === candidate.sourceEventId) ?? null
          : null,
      ),
    ),
  }));

  const constitutionalFailed: ScoredNotificationCandidate[] = [];
  const constitutionalPassed: ScoredNotificationCandidate[] = [];
  const constitutionalChecks: Record<string, ConstitutionalCheckResult> = {};

  for (const c of scored) {
    const check = evaluateConstitutionalCompliance(c, {
      recentlyOpenedApp:
        ctx.lastAppOpenedAt !== null &&
        now.getTime() - ctx.lastAppOpenedAt < 2 * 60 * 60 * 1000,
      openedWithinTwoWeeks,
    });
    constitutionalChecks[c.id] = check;

    if (!check.pass) {
      const suppressed: ScoredNotificationCandidate = {
        ...c,
        suppressionReason: 'constitutional_failure',
      };
      constitutionalFailed.push(suppressed);
      pushAudit(auditLog, {
        action: 'suppressed',
        candidateId: c.id,
        candidateType: c.type,
        interruptionReason: c.interruptionReason,
        suppressionReason: 'constitutional_failure',
        bundleId: null,
        bundleKey: c.bundleKey,
        decision: 'suppress',
      });
    } else {
      constitutionalPassed.push(c);
    }
  }

  const scoreById = new Map(
    constitutionalPassed.map((c) => [c.id, c.interruptionScore] as const),
  );

  const suppressionResults = applyNotificationSuppression(
    constitutionalPassed.map((c) => ({
      candidate: c,
      interruptionScore: c.interruptionScore,
    })),
    ctx,
  );
  const engineSuppressed: ScoredNotificationCandidate[] = [];
  const engineEligible: ScoredNotificationCandidate[] = [];
  const engineSuppressedById = new Map<string, NotificationSuppressionReason>();

  for (const result of suppressionResults) {
    const interruptionScore = scoreById.get(result.candidate.id);
    if (!interruptionScore) continue;

    if (result.suppressed && result.reason) {
      engineSuppressedById.set(result.candidate.id, result.reason);
      engineSuppressed.push({
        ...result.candidate,
        interruptionScore,
        suppressionReason: result.reason,
      });
      pushAudit(auditLog, {
        action: 'suppressed',
        candidateId: result.candidate.id,
        candidateType: result.candidate.type,
        interruptionReason: result.candidate.interruptionReason,
        suppressionReason: result.reason,
        bundleId: null,
        bundleKey: result.candidate.bundleKey,
        decision: 'suppress',
      });
    } else {
      engineEligible.push({
        ...result.candidate,
        interruptionScore,
        suppressionReason: null,
      });
    }
  }

  const allSuppressed = [...constitutionalFailed, ...engineSuppressed];
  const { bundles, processed } = bundleNotificationCandidates(engineEligible, allSuppressed);

  for (const p of processed.filter((x) => x.bundledIntoId)) {
    pushAudit(auditLog, {
      action: 'bundled',
      candidateId: p.id,
      candidateType: p.type,
      interruptionReason: p.interruptionReason,
      suppressionReason: 'bundled_into_other_notification',
      bundleId: p.bundledIntoId,
      bundleKey: p.bundleKey,
      decision: 'suppress',
    });
  }

  const caps = ctx.dailyCaps ?? DEFAULT_NOTIFICATION_DAILY_CAPS;
  const bundlesBeforeCaps = bundles;
  const { approved, capped } = applyDailyCaps(bundles, caps);
  const cappedBundleIds = new Set(capped.map((b) => b.id));

  for (const b of capped) {
    for (const id of b.candidateIds) {
      pushAudit(auditLog, {
        action: 'suppressed',
        candidateId: id,
        candidateType: b.type,
        interruptionReason: b.interruptionReason,
        suppressionReason: 'daily_cap_reached',
        bundleId: b.id,
        bundleKey: b.bundleKey,
        decision: 'suppress',
      });
    }
  }

  for (const b of approved) {
    for (const id of b.candidateIds) {
      pushAudit(auditLog, {
        action: 'approved',
        candidateId: id,
        candidateType: b.type,
        interruptionReason: b.interruptionReason,
        suppressionReason: null,
        bundleId: b.id,
        bundleKey: b.bundleKey,
        decision: 'send',
      });
    }
  }

  logNotificationAudit(auditLog, approved, processed);

  const snapshot: NotificationIntelligenceSnapshot = {
    generatedAt: now,
    candidates: processed,
    bundles: [...approved, ...capped],
    approvedBundles: approved,
    auditLog,
  };

  return {
    snapshot,
    diagnostics: {
      rawGenerated: raw,
      constitutionalChecks,
      engineSuppressedById,
      engineEligible,
      bundlesBeforeCaps,
      cappedBundleIds,
    },
  };
}
