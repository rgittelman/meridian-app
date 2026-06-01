import type { MeridianCalendarEvent } from '@/types/calendar';
import type {
  NotificationCandidate,
  NotificationCandidateType,
  NotificationFeedRow,
  NotificationVerificationSnapshot,
  NotificationVerificationTrace,
  ProcessedNotificationCandidate,
  ScoredNotificationCandidate,
} from '@/types/notification';
import type { ConstitutionalCheckResult } from './constitutionalCheck';
import {
  buildNotificationIntelligenceWithDiagnostics,
  type BuildNotificationIntelligenceInput,
  type NotificationPipelineDiagnostics,
} from './buildNotificationIntelligence';
import { notificationTypeLabel, formatTimingWindow, suppressionReasonLabel } from './verificationLabels';
import { generateMorningBriefCandidates } from './generateMorningBrief';
import { generateTransitionAwarenessCandidates } from './generateTransitionAwareness';
import { generateEveningWindDownCandidates } from './generateEveningWindDown';
import { generateCriticalProtectionCandidates } from './generateCriticalProtection';
import { enrichEventsWithCaptureRelationships } from '@/services/relationships/calendarCaptureIndex';
import { buildPrepIntelligence } from '@/services/prep/buildPrepIntelligence';
import type { LifeObject } from '@/types/capture';
import {
  deriveNotificationSilenceReasons,
  deriveNotificationSystemStatus,
} from './deriveSilenceReasons';

function eventTitleById(
  events: MeridianCalendarEvent[],
  eventId: string | null,
): string | null {
  if (!eventId) return null;
  const e = events.find((x) => x.id === eventId);
  return e ? (e.displayTitle ?? e.title) : null;
}

function toFeedRow(
  c: NotificationCandidate | ProcessedNotificationCandidate,
  events: MeridianCalendarEvent[],
  opts: { isPreview?: boolean; decision?: 'send' | 'suppress'; reason?: string | null },
): NotificationFeedRow {
  const decision = opts.decision ?? ('decision' in c ? c.decision : 'suppress');
  const reason =
    opts.reason ??
    ('suppressionReason' in c ? suppressionReasonLabel(c.suppressionReason) : null);

  return {
    id: c.id,
    type: c.type,
    typeLabel: notificationTypeLabel(c.type),
    decision,
    reason: decision === 'send' ? 'Approved for delivery' : reason,
    timing: formatTimingWindow(c.targetWindowStart, c.targetWindowEnd),
    relatedEvent: eventTitleById(events, c.sourceEventId),
    relatedPeople: c.sourcePeople.length > 0 ? c.sourcePeople.join(' · ') : '—',
    primaryLine: c.primaryLine,
    isPreview: opts.isPreview ?? false,
  };
}

function buildTraces(
  diagnostics: NotificationPipelineDiagnostics,
  processed: ProcessedNotificationCandidate[],
  approvedBundleIds: Set<string>,
  cappedBundleIds: Set<string>,
): NotificationVerificationTrace[] {
  const { constitutionalChecks, engineSuppressedById, bundlesBeforeCaps, cappedBundleIds: capped } =
    diagnostics;

  const bundleByCandidate = new Map<string, { bundleId: string; isLead: boolean }>();
  for (const bundle of bundlesBeforeCaps) {
    const leadId = bundle.candidateIds[0];
    for (const id of bundle.candidateIds) {
      bundleByCandidate.set(id, { bundleId: bundle.id, isLead: id === leadId });
    }
  }

  const allIds = new Set([
    ...diagnostics.rawGenerated.map((c) => c.id),
    ...processed.map((c) => c.id),
  ]);

  const traces: NotificationVerificationTrace[] = [];

  for (const id of allIds) {
    const processedRow = processed.find((p) => p.id === id);
    const raw = diagnostics.rawGenerated.find((r) => r.id === id);
    if (!raw && !processedRow) continue;

    const type = (processedRow ?? raw)!.type;
    const constitutional = constitutionalChecks[id];
    const engineReason = engineSuppressedById.get(id);
    const bundleInfo = bundleByCandidate.get(id);

    const steps: NotificationVerificationTrace['steps'] = [
      { stage: 'generated', outcome: 'pass', detail: 'Candidate generated' },
    ];

    if (constitutional) {
      steps.push({
        stage: 'constitutional_check',
        outcome: constitutional.pass ? 'pass' : 'fail',
        detail: constitutional.pass
          ? 'PASS'
          : `FAIL — ${constitutional.failureReason ?? 'constitutional_failure'}`,
      });
    } else {
      steps.push({
        stage: 'constitutional_check',
        outcome: 'skipped',
        detail: 'Not reached',
      });
    }

    if (engineReason) {
      steps.push({
        stage: 'suppression',
        outcome: 'fail',
        detail: `FAIL — ${suppressionReasonLabel(engineReason)}`,
      });
      steps.push({ stage: 'bundling', outcome: 'skipped', detail: 'Not reached' });
      steps.push({ stage: 'daily_caps', outcome: 'skipped', detail: 'Not reached' });
    } else if (constitutional && !constitutional.pass) {
      steps.push({
        stage: 'suppression',
        outcome: 'skipped',
        detail: 'Skipped after constitutional failure',
      });
      steps.push({ stage: 'bundling', outcome: 'skipped', detail: 'Not reached' });
      steps.push({ stage: 'daily_caps', outcome: 'skipped', detail: 'Not reached' });
    } else {
      steps.push({ stage: 'suppression', outcome: 'pass', detail: 'PASS' });

      if (bundleInfo) {
        if (processedRow?.bundledIntoId) {
          steps.push({
            stage: 'bundling',
            outcome: 'fail',
            detail: `Merged into ${processedRow.bundledIntoId}`,
          });
        } else {
          steps.push({ stage: 'bundling', outcome: 'pass', detail: 'PASS — bundle lead' });
        }
      } else if (processedRow?.decision === 'send') {
        steps.push({ stage: 'bundling', outcome: 'pass', detail: 'PASS — standalone' });
      } else {
        steps.push({ stage: 'bundling', outcome: 'skipped', detail: 'Not reached' });
      }

      const bundleId = bundleInfo?.bundleId;
      if (bundleId && capped.has(bundleId)) {
        steps.push({
          stage: 'daily_caps',
          outcome: 'fail',
          detail: 'FAIL — Daily cap reached',
        });
      } else if (bundleId && approvedBundleIds.has(bundleId)) {
        steps.push({ stage: 'daily_caps', outcome: 'pass', detail: 'PASS' });
      } else if (!bundleInfo && processedRow?.decision === 'send') {
        steps.push({ stage: 'daily_caps', outcome: 'pass', detail: 'PASS' });
      } else if (processedRow?.suppressionReason === 'bundled_into_other_notification') {
        steps.push({ stage: 'daily_caps', outcome: 'skipped', detail: 'Bundled (non-lead)' });
      } else {
        steps.push({ stage: 'daily_caps', outcome: 'skipped', detail: 'Not reached' });
      }
    }

    const finalDecision =
      processedRow?.decision === 'send' && !processedRow.bundledIntoId
        ? 'approved'
        : 'suppressed';

    const finalReason =
      processedRow?.suppressionReason
        ? suppressionReasonLabel(processedRow.suppressionReason)
        : finalDecision === 'approved'
          ? null
          : engineReason
            ? suppressionReasonLabel(engineReason)
            : constitutional && !constitutional.pass
              ? suppressionReasonLabel('constitutional_failure')
              : null;

    traces.push({
      candidateId: id,
      type,
      typeLabel: notificationTypeLabel(type),
      steps,
      finalDecision,
      finalReason,
    });
  }

  return traces.sort((a, b) => a.typeLabel.localeCompare(b.typeLabel));
}

function buildTypePreviews(
  events: MeridianCalendarEvent[],
  captures: LifeObject[],
  now: Date,
): Partial<Record<NotificationCandidateType, NotificationFeedRow[]>> {
  const { events: enriched, index } = enrichEventsWithCaptureRelationships(events, captures);
  const prepClusters = buildPrepIntelligence(enriched, index, now.getTime()).clusters;
  const bypass = { bypassDeliveryWindow: true };

  const previews: Partial<Record<NotificationCandidateType, NotificationFeedRow[]>> = {
    morning_brief: generateMorningBriefCandidates(enriched, now, bypass).map((c) =>
      toFeedRow(c, enriched, { isPreview: true, decision: 'suppress', reason: 'Preview only' }),
    ),
    transition_awareness: generateTransitionAwarenessCandidates(
      enriched,
      prepClusters,
      now,
      bypass,
    ).map((c) =>
      toFeedRow(c, enriched, { isPreview: true, decision: 'suppress', reason: 'Preview only' }),
    ),
    evening_wind_down: generateEveningWindDownCandidates(enriched, now, bypass).map((c) =>
      toFeedRow(c, enriched, { isPreview: true, decision: 'suppress', reason: 'Preview only' }),
    ),
    critical_commitment_protection: generateCriticalProtectionCandidates(
      enriched,
      now,
      bypass,
    ).map((c) =>
      toFeedRow(c, enriched, { isPreview: true, decision: 'suppress', reason: 'Preview only' }),
    ),
  };

  return previews;
}

/**
 * Dev verification snapshot — inspect SEND/SUPPRESS without delivery.
 */
export function buildNotificationVerificationSnapshot(
  input: BuildNotificationIntelligenceInput,
  eventsForLookup?: MeridianCalendarEvent[],
): NotificationVerificationSnapshot {
  const { snapshot, diagnostics } = buildNotificationIntelligenceWithDiagnostics(input);
  const events = eventsForLookup ?? input.events;
  const now = input.now ?? new Date();

  const approvedIds = new Set(snapshot.approvedBundles.map((b) => b.id));
  const cappedIds = new Set(
    snapshot.bundles.filter((b) => b.decision === 'suppress').map((b) => b.id),
  );

  const traces = buildTraces(diagnostics, snapshot.candidates, approvedIds, cappedIds);

  const generatedRows = diagnostics.rawGenerated.map((c) =>
    toFeedRow(c, events, { decision: 'suppress', reason: 'Awaiting pipeline' }),
  );

  const suppressedRows = snapshot.candidates
    .filter((c) => c.decision === 'suppress')
    .map((c) =>
      toFeedRow(c, events, {
        decision: 'suppress',
        reason: suppressionReasonLabel(c.suppressionReason),
      }),
    );

  const bundledRows = snapshot.candidates
    .filter((c) => c.suppressionReason === 'bundled_into_other_notification')
    .map((c) =>
      toFeedRow(c, events, {
        decision: 'suppress',
        reason: 'Bundled into another notification',
      }),
    );

  const approvedRows: NotificationFeedRow[] = [];
  for (const bundle of snapshot.approvedBundles) {
    for (const cid of bundle.candidateIds) {
      const c = snapshot.candidates.find((x) => x.id === cid);
      if (c) {
        approvedRows.push(
          toFeedRow(c, events, { decision: 'send', reason: `Bundle: ${bundle.title}` }),
        );
      }
    }
  }

  const silenceReasons = deriveNotificationSilenceReasons({
    events,
    captures: input.captures,
    context: input.context,
    diagnostics,
    approvedCount: snapshot.approvedBundles.length,
    now,
  });

  const systemStatus = deriveNotificationSystemStatus(
    diagnostics.rawGenerated.length,
    snapshot.approvedBundles.length,
  );

  return {
    intelligence: snapshot,
    traces,
    feed: {
      generated: generatedRows,
      suppressed: suppressedRows,
      bundled: bundledRows,
      approved: approvedRows,
    },
    bundlingReview: {
      before: diagnostics.engineEligible.map((c) => ({
        id: c.id,
        type: c.type,
        primaryLine: c.primaryLine,
      })),
      after: diagnostics.bundlesBeforeCaps,
    },
    previewsByType: buildTypePreviews(events, input.captures, now),
    silenceReasons,
    systemStatus,
  };
}
