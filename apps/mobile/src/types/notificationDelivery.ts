import type {
  NotificationBundle,
  NotificationCandidateType,
} from '@/types/notification';

/**
 * Delivery layer input — must be an intelligence-approved bundle only.
 * Raw events, captures, prep clusters, and Life objects are forbidden at this boundary.
 */
export type ApprovedNotificationBundle = NotificationBundle & {
  decision: 'send';
};

export type NotificationPermissionState =
  | 'unknown'
  | 'granted'
  | 'denied'
  | 'provisional'
  | 'unavailable';

export type ScheduledNotificationStatus =
  | 'scheduled'
  | 'delivered'
  | 'cancelled'
  | 'expired'
  | 'failed';

export type ScheduledNotificationCancellationReason =
  | 'bundle_no_longer_approved'
  | 'source_event_changed'
  | 'source_capture_resolved'
  | 'user_opened_app'
  | 'daily_cap_changed'
  | 'permissions_unavailable'
  | 'manual_clear'
  | 'expired'
  | 'duplicate_prevented'
  | 'content_changed';

/** Stable dedupe identity — transport layer only, no intelligence decisions. */
export type NotificationDeliveryDedupeKey = {
  bundleId: string;
  bundleKey: string;
  sourceEventIds: string[];
  targetWindowStart: string;
  targetWindowEnd: string;
};

export type NotificationTapDestination =
  | { screen: 'focus' }
  | { screen: 'plan' }
  | { screen: 'event_detail'; eventId: string }
  | { screen: 'capture_detail'; captureId: string };

/**
 * Persisted local delivery record — mirrors what the OS scheduler should fire.
 * Content is copied from approved bundles; delivery must not invent copy.
 */
export type ScheduledNotificationRecord = {
  id: string;
  bundleId: string;
  bundleKey: string;
  candidateIds: string[];
  notificationType: NotificationCandidateType;
  title: string;
  body: string;
  scheduledFor: Date;
  targetWindowStart: Date;
  targetWindowEnd: Date;
  sourceEventIds: string[];
  sourceCaptureIds: string[];
  deliveryStatus: ScheduledNotificationStatus;
  dedupeKey: NotificationDeliveryDedupeKey;
  tapDestination: NotificationTapDestination;
  platformNotificationId: string | null;
  cancellationReason: ScheduledNotificationCancellationReason | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ReconciliationAction =
  | 'schedule_new'
  | 'keep_existing'
  | 'cancel_stale'
  | 'reschedule_changed'
  | 'expire_passed';

export type ReconciliationDecision = {
  action: ReconciliationAction;
  bundleId: string;
  recordId?: string;
  reason: string;
};

export type ReconciliationResult = {
  at: Date;
  permissionState: NotificationPermissionState;
  scheduled: ScheduledNotificationRecord[];
  cancelled: ScheduledNotificationRecord[];
  kept: ScheduledNotificationRecord[];
  expired: ScheduledNotificationRecord[];
  decisions: ReconciliationDecision[];
  errors: Array<{ bundleId: string; message: string }>;
};

export type ScheduleBundleResult =
  | { ok: true; record: ScheduledNotificationRecord }
  | {
      ok: false;
      reason:
        | 'not_approved'
        | 'permissions_unavailable'
        | 'duplicate'
        | 'window_expired'
        | 'transport_error';
      message: string;
    };

/**
 * Delivery boundary — transport only. Intelligence decisions happen upstream.
 * Implementation (Expo Notifications, etc.) comes in a later phase.
 */
export interface NotificationDeliveryScheduler {
  readonly permissionState: NotificationPermissionState;

  scheduleApprovedBundle(
    bundle: ApprovedNotificationBundle,
    options?: { scheduledFor?: Date },
  ): Promise<ScheduleBundleResult>;

  cancelScheduledBundle(
    bundleId: string,
    reason: ScheduledNotificationCancellationReason,
  ): Promise<void>;

  cancelAllMeridianNotifications(
    reason?: ScheduledNotificationCancellationReason,
  ): Promise<void>;

  reconcileScheduledNotifications(
    approvedBundles: ApprovedNotificationBundle[],
    context?: NotificationDeliveryContext,
  ): Promise<ReconciliationResult>;

  getScheduledMeridianNotifications(): Promise<ScheduledNotificationRecord[]>;
}

/** Context signals for reconciliation — not for candidate generation. */
export type NotificationDeliveryContext = {
  now?: Date;
  lastAppOpenedAt?: number | null;
  /** Event id → start time ISO for change detection */
  eventStartTimes?: Record<string, string>;
  /** Capture id → resolved flag */
  resolvedCaptureIds?: ReadonlySet<string>;
};

export function isApprovedNotificationBundle(
  bundle: NotificationBundle,
): bundle is ApprovedNotificationBundle {
  return bundle.decision === 'send';
}

export function buildDeliveryDedupeKey(
  bundle: ApprovedNotificationBundle,
  sourceEventIds: string[] = [],
): NotificationDeliveryDedupeKey {
  return buildDeliveryDedupeKeyFromParts({
    bundleId: bundle.id,
    bundleKey: bundle.bundleKey,
    sourceEventIds,
    targetWindowStart: bundle.targetWindowStart,
    targetWindowEnd: bundle.targetWindowEnd,
  });
}

export function buildDeliveryDedupeKeyFromParts(parts: {
  bundleId: string;
  bundleKey: string;
  sourceEventIds: string[];
  targetWindowStart: Date;
  targetWindowEnd: Date;
}): NotificationDeliveryDedupeKey {
  return {
    bundleId: parts.bundleId,
    bundleKey: parts.bundleKey,
    sourceEventIds: [...parts.sourceEventIds].sort(),
    targetWindowStart: parts.targetWindowStart.toISOString(),
    targetWindowEnd: parts.targetWindowEnd.toISOString(),
  };
}

export function extractSourceEventIdsFromBundle(
  bundle: ApprovedNotificationBundle,
  candidateSourceEventIds?: ReadonlyMap<string, string | null>,
): string[] {
  if (!candidateSourceEventIds) return [];
  const ids = new Set<string>();
  for (const candidateId of bundle.candidateIds) {
    const eventId = candidateSourceEventIds.get(candidateId);
    if (eventId) ids.add(eventId);
  }
  return [...ids].sort();
}

export function deliveryBodyFromBundle(bundle: ApprovedNotificationBundle): string {
  return bundle.lines.join('\n');
}
