import type { ApprovedNotificationBundle } from '@/types/notificationDelivery';
import type {
  NotificationDeliveryContext,
  ReconciliationAction,
  ReconciliationDecision,
  ScheduledNotificationRecord,
} from '@/types/notificationDelivery';
import { buildDeliveryDedupeKeyFromParts } from '@/types/notificationDelivery';

/**
 * Phase H.2 — minimum timing shift that triggers a reschedule.
 * Noise below this threshold (API jitter, minor traffic fluctuation) is ignored.
 */
export const TIMING_DRIFT_THRESHOLD_MS = 5 * 60 * 1000;

export type ReconciliationPlanInput = {
  approvedBundles: ApprovedNotificationBundle[];
  scheduledRecords: ScheduledNotificationRecord[];
  context?: NotificationDeliveryContext;
};

/**
 * Pure reconciliation plan — no OS calls, no scheduling.
 * Implementation phase will execute these decisions against the platform adapter.
 */
export function planNotificationReconciliation(
  input: ReconciliationPlanInput,
): ReconciliationDecision[] {
  const now = input.context?.now ?? new Date();
  const decisions: ReconciliationDecision[] = [];
  const approvedById = new Map(input.approvedBundles.map((b) => [b.id, b]));
  const approvedBundleIds = new Set(input.approvedBundles.map((b) => b.id));

  const seenDedupe = new Set<string>();

  for (const record of input.scheduledRecords) {
    if (record.deliveryStatus === 'delivered') continue;

    if (record.targetWindowEnd.getTime() < now.getTime()) {
      decisions.push({
        action: 'expire_passed',
        bundleId: record.bundleId,
        recordId: record.id,
        reason: 'Delivery window passed',
      });
      continue;
    }

    if (!approvedBundleIds.has(record.bundleId)) {
      decisions.push({
        action: 'cancel_stale',
        bundleId: record.bundleId,
        recordId: record.id,
        reason: 'Bundle no longer approved',
      });
      continue;
    }

    const bundle = approvedById.get(record.bundleId)!;
    const eventChanged = hasSourceEventTimeChange(record, input.context);
    if (eventChanged) {
      decisions.push({
        action: 'cancel_stale',
        bundleId: record.bundleId,
        recordId: record.id,
        reason: 'Source event time changed',
      });
      decisions.push({
        action: 'schedule_new',
        bundleId: bundle.id,
        reason: 'Reschedule after source event change',
      });
      continue;
    }

    if (hasResolvedCapture(record, input.context)) {
      decisions.push({
        action: 'cancel_stale',
        bundleId: record.bundleId,
        recordId: record.id,
        reason: 'Source capture resolved',
      });
      continue;
    }

    if (contentFingerprint(record) !== contentFingerprintFromBundle(bundle)) {
      decisions.push({
        action: 'reschedule_changed',
        bundleId: record.bundleId,
        recordId: record.id,
        reason: 'Bundle content changed',
      });
      continue;
    }

    if (hasAlertTimingDrift(record, bundle)) {
      decisions.push({
        action: 'reschedule_changed',
        bundleId: record.bundleId,
        recordId: record.id,
        reason: 'Alert timing drift exceeds threshold',
      });
      continue;
    }

    if (shouldCancelForRecentAppOpen(record, input.context, now)) {
      decisions.push({
        action: 'cancel_stale',
        bundleId: record.bundleId,
        recordId: record.id,
        reason: 'User recently opened app — awareness in-app',
      });
      continue;
    }

    decisions.push({
      action: 'keep_existing',
      bundleId: record.bundleId,
      recordId: record.id,
      reason: 'Still approved and unchanged',
    });
  }

  for (const bundle of input.approvedBundles) {
    const existing = input.scheduledRecords.find(
      (r) =>
        r.bundleId === bundle.id &&
        r.deliveryStatus === 'scheduled',
    );
    if (existing) continue;

    const dedupe = buildDeliveryDedupeKeyFromParts({
      bundleId: bundle.id,
      bundleKey: bundle.bundleKey,
      sourceEventIds: [],
      targetWindowStart: bundle.targetWindowStart,
      targetWindowEnd: bundle.targetWindowEnd,
    });
    const dedupeToken = JSON.stringify(dedupe);
    if (seenDedupe.has(dedupeToken)) {
      decisions.push({
        action: 'cancel_stale',
        bundleId: bundle.id,
        reason: 'Duplicate prevention — same window awareness',
      });
      continue;
    }
    seenDedupe.add(dedupeToken);

    if (bundle.targetWindowEnd.getTime() < now.getTime()) {
      decisions.push({
        action: 'expire_passed',
        bundleId: bundle.id,
        reason: 'Approved bundle window already passed',
      });
      continue;
    }

    decisions.push({
      action: 'schedule_new',
      bundleId: bundle.id,
      reason: 'Newly approved bundle',
    });
  }

  return decisions;
}

function contentFingerprint(record: ScheduledNotificationRecord): string {
  return `${record.title}|${record.body}`;
}

function contentFingerprintFromBundle(bundle: ApprovedNotificationBundle): string {
  return `${bundle.title}|${bundle.lines.join('\n')}`;
}

function hasSourceEventTimeChange(
  record: ScheduledNotificationRecord,
  context?: NotificationDeliveryContext,
): boolean {
  if (!context?.eventStartTimes) return false;
  for (const eventId of record.sourceEventIds) {
    const current = context.eventStartTimes[eventId];
    if (!current) continue;
    const scheduledIso = record.scheduledFor.toISOString();
    if (current !== scheduledIso) return true;
  }
  return false;
}

function hasResolvedCapture(
  record: ScheduledNotificationRecord,
  context?: NotificationDeliveryContext,
): boolean {
  if (!context?.resolvedCaptureIds) return false;
  return record.sourceCaptureIds.some((id) => context.resolvedCaptureIds!.has(id));
}

/**
 * Phase H.2 — returns true when the bundle's target window has shifted more
 * than TIMING_DRIFT_THRESHOLD_MS from the record's scheduled window.
 * Triggers reschedule_changed so the OS notification fires at the new time.
 * Noise below the threshold (API jitter, minor traffic changes) is ignored.
 */
export function hasAlertTimingDrift(
  record: ScheduledNotificationRecord,
  bundle: ApprovedNotificationBundle,
  thresholdMs = TIMING_DRIFT_THRESHOLD_MS,
): boolean {
  const existingMs = record.targetWindowStart.getTime();
  const newMs = bundle.targetWindowStart.getTime();
  return Math.abs(newMs - existingMs) > thresholdMs;
}

function shouldCancelForRecentAppOpen(
  record: ScheduledNotificationRecord,
  context: NotificationDeliveryContext | undefined,
  now: Date,
): boolean {
  const lastOpen = context?.lastAppOpenedAt;
  if (!lastOpen) return false;
  const twoHours = 2 * 60 * 60 * 1000;
  if (now.getTime() - lastOpen > twoHours) return false;
  return (
    record.notificationType === 'transition_awareness' ||
    record.notificationType === 'morning_brief'
  );
}
