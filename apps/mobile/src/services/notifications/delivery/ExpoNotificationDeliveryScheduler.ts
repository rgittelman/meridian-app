/**
 * Meridian — Expo Notification Delivery Scheduler
 *
 * Real implementation of NotificationDeliveryScheduler using expo-notifications.
 * Replaces NoOpNotificationDeliveryScheduler for production builds.
 *
 * Design principles:
 * - Delivery store is the authoritative record of what is scheduled.
 *   Never read the OS scheduler as a source of truth — it strips content metadata.
 * - All Meridian notifications carry `data.meridianManaged: true` so tap handlers
 *   can distinguish them from any third-party SDK notifications.
 * - Deduplication is applied before any OS call using bundleKey + targetWindowStart.
 * - Permissions are never requested here — that is the caller's responsibility.
 *   If permissionState !== 'granted', scheduling returns 'permissions_unavailable'.
 * - No lifecycle wiring lives here — this class is a pure scheduler.
 *   Callers (future useNotificationDelivery hook) decide when to call reconcile.
 *
 * Scope:
 * - scheduleApprovedBundle     → Expo.scheduleNotificationAsync
 * - cancelScheduledBundle      → Expo.cancelScheduledNotificationAsync
 * - cancelAllMeridianNotifications → cancel each record individually
 * - reconcileScheduledNotifications → execute planNotificationReconciliation decisions
 * - getScheduledMeridianNotifications → read from delivery store
 *
 * Explicitly excluded from this class:
 * - Permission requests (see notificationPermissions.ts)
 * - App lifecycle triggers (future Phase B)
 * - Quiet hours enforcement (future Phase C, Settings)
 * - Background scheduling (future Phase F)
 */

import * as ExpoNotifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { nanoid } from 'nanoid/non-secure';

import type {
  ApprovedNotificationBundle,
  NotificationDeliveryContext,
  NotificationDeliveryScheduler,
  NotificationPermissionState,
  ReconciliationResult,
  ScheduleBundleResult,
  ScheduledNotificationCancellationReason,
  ScheduledNotificationRecord,
  ScheduledNotificationStatus,
} from '@/types/notificationDelivery';
import {
  buildDeliveryDedupeKeyFromParts,
  deliveryBodyFromBundle,
  isApprovedNotificationBundle,
} from '@/types/notificationDelivery';
import { resolveNotificationTapDestination } from './resolveTapDestination';
import { planNotificationReconciliation } from './reconciliationPlan';
import { useNotificationDeliveryStore } from '@/store/notificationDeliveryStore';
import { getNotificationPermissionState } from './notificationPermissions';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Data key stamped on all Meridian notifications to identify them in tap handlers. */
const MERIDIAN_MANAGED_KEY = 'meridianManaged';

/** iOS notification channel id — required on Android 8+. */
const MERIDIAN_CHANNEL_ID = 'meridian-default';

// ── Channel setup ─────────────────────────────────────────────────────────────

/**
 * Creates the Meridian notification channel on Android.
 * Safe to call repeatedly — no-op on iOS and if channel already exists.
 * Called once in the constructor; does not block scheduling.
 */
async function ensureAndroidChannel(): Promise<void> {
  try {
    await ExpoNotifications.setNotificationChannelAsync(MERIDIAN_CHANNEL_ID, {
      name: 'Meridian',
      importance: ExpoNotifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#B0A080',
    });
  } catch {
    // Non-fatal — Android channels are best-effort; iOS ignores this call.
  }
}

// ── Scheduler ─────────────────────────────────────────────────────────────────

export class ExpoNotificationDeliveryScheduler implements NotificationDeliveryScheduler {
  /** Reflects the OS permission state as of the last explicit check. */
  get permissionState(): NotificationPermissionState {
    return useNotificationDeliveryStore.getState().permissionState;
  }

  /**
   * In-flight guard — prevents duplicate scheduling when concurrent async calls
   * both read the store before either write completes.
   *
   * Key: `bundleKey:targetWindowStart` (ISO string).
   * Added synchronously before any await; removed in finally after upsertRecord.
   */
  private readonly inFlight = new Set<string>();

  constructor() {
    // Set up Android channel asynchronously — never blocks scheduling.
    void ensureAndroidChannel();
  }

  // ── scheduleApprovedBundle ──────────────────────────────────────────────────

  async scheduleApprovedBundle(
    bundle: ApprovedNotificationBundle,
    options?: { scheduledFor?: Date },
  ): Promise<ScheduleBundleResult> {
    // Gate 0: in-flight race guard — synchronous, before any await.
    // Prevents two concurrent calls from both passing Gate 4's store check
    // before either one has written its record back.
    const flightKey = `${bundle.bundleKey}:${bundle.targetWindowStart.toISOString()}`;
    if (this.inFlight.has(flightKey)) {
      return {
        ok: false,
        reason: 'duplicate',
        message: `Bundle "${bundle.bundleKey}" is already being scheduled (in-flight).`,
      };
    }
    this.inFlight.add(flightKey);

    try {
      return await this._scheduleApprovedBundleInner(bundle, options);
    } finally {
      this.inFlight.delete(flightKey);
    }
  }

  /** Inner implementation — called only after the in-flight guard is set. */
  private async _scheduleApprovedBundleInner(
    bundle: ApprovedNotificationBundle,
    options?: { scheduledFor?: Date },
  ): Promise<ScheduleBundleResult> {
    // Gate 1: must be intelligence-approved
    if (!isApprovedNotificationBundle(bundle)) {
      return {
        ok: false,
        reason: 'not_approved',
        message: 'Only intelligence-approved bundles may be scheduled.',
      };
    }

    // Gate 2: must have OS permission — never request here
    const currentPermission = await getNotificationPermissionState();
    useNotificationDeliveryStore.getState().setPermissionState(currentPermission);

    if (currentPermission !== 'granted' && currentPermission !== 'provisional') {
      return {
        ok: false,
        reason: 'permissions_unavailable',
        message: `Notification permission is "${currentPermission}". Enable in Settings to receive notifications.`,
      };
    }

    // Resolve the scheduled fire time
    const scheduledFor = options?.scheduledFor ?? bundle.targetWindowStart;
    const now = new Date();

    // Gate 3: window must not have already passed
    if (scheduledFor.getTime() <= now.getTime()) {
      return {
        ok: false,
        reason: 'window_expired',
        message: 'Scheduled time has already passed.',
      };
    }

    // Gate 4: deduplicate — same bundleKey + targetWindowStart already scheduled
    const store = useNotificationDeliveryStore.getState();
    const dedupeKey = buildDeliveryDedupeKeyFromParts({
      bundleId: bundle.id,
      bundleKey: bundle.bundleKey,
      sourceEventIds: [],
      targetWindowStart: bundle.targetWindowStart,
      targetWindowEnd: bundle.targetWindowEnd,
    });

    const isDuplicate = store.records.some(
      (r) =>
        r.deliveryStatus === 'scheduled' &&
        r.dedupeKey.bundleKey === dedupeKey.bundleKey &&
        r.dedupeKey.targetWindowStart === dedupeKey.targetWindowStart,
    );
    if (isDuplicate) {
      return {
        ok: false,
        reason: 'duplicate',
        message: `Bundle "${bundle.bundleKey}" is already scheduled for this window.`,
      };
    }

    // Resolve tap destination from bundle type and source ids
    const primarySourceEventId = bundle.candidateIds.length > 0
      ? null  // resolved via candidateSourceEventIds map in Phase B; null for now
      : null;
    const tapDestination = resolveNotificationTapDestination({
      type: bundle.type,
      primarySourceEventId,
      primarySourceCaptureId: null,
    });

    // Schedule via Expo OS scheduler
    let platformNotificationId: string | null = null;
    try {
      platformNotificationId = await ExpoNotifications.scheduleNotificationAsync({
        content: {
          title: bundle.title,
          body: deliveryBodyFromBundle(bundle),
          data: {
            [MERIDIAN_MANAGED_KEY]: true,
            bundleId: bundle.id,
            bundleKey: bundle.bundleKey,
            notificationType: bundle.type,
            tapDestination,
          },
          sound: 'default',
        },
        trigger: {
          type: SchedulableTriggerInputTypes.DATE,
          date: scheduledFor,
        },
      });
    } catch (err) {
      return {
        ok: false,
        reason: 'transport_error',
        message: err instanceof Error ? err.message : 'Unknown scheduling error.',
      };
    }

    // Persist the record
    const now2 = new Date();
    const record: ScheduledNotificationRecord = {
      id: nanoid(),
      bundleId: bundle.id,
      bundleKey: bundle.bundleKey,
      candidateIds: bundle.candidateIds,
      notificationType: bundle.type,
      title: bundle.title,
      body: deliveryBodyFromBundle(bundle),
      scheduledFor,
      targetWindowStart: bundle.targetWindowStart,
      targetWindowEnd: bundle.targetWindowEnd,
      sourceEventIds: [],   // populated in Phase B when candidateSourceEventIds map is available
      sourceCaptureIds: [],
      deliveryStatus: 'scheduled',
      dedupeKey,
      tapDestination,
      platformNotificationId,
      cancellationReason: null,
      createdAt: now2,
      updatedAt: now2,
    };

    store.upsertRecord(record);
    return { ok: true, record };
  }

  // ── cancelScheduledBundle ───────────────────────────────────────────────────

  async cancelScheduledBundle(
    bundleId: string,
    reason: ScheduledNotificationCancellationReason,
  ): Promise<void> {
    const store = useNotificationDeliveryStore.getState();
    const record = store.records.find(
      (r) => r.bundleId === bundleId && r.deliveryStatus === 'scheduled',
    );
    if (!record) return;

    if (record.platformNotificationId) {
      try {
        await ExpoNotifications.cancelScheduledNotificationAsync(
          record.platformNotificationId,
        );
      } catch {
        // Non-fatal — notification may have already fired or been dismissed by OS
      }
    }

    store.markRecordStatus(record.id, 'cancelled', reason);
  }

  // ── cancelAllMeridianNotifications ─────────────────────────────────────────

  async cancelAllMeridianNotifications(
    reason: ScheduledNotificationCancellationReason = 'manual_clear',
  ): Promise<void> {
    const store = useNotificationDeliveryStore.getState();
    const scheduled = store.records.filter((r) => r.deliveryStatus === 'scheduled');

    // Cancel each by platformNotificationId rather than cancelAllScheduledNotificationsAsync
    // to avoid accidentally cancelling notifications from other libraries.
    await Promise.allSettled(
      scheduled
        .filter((r) => r.platformNotificationId !== null)
        .map((r) =>
          ExpoNotifications.cancelScheduledNotificationAsync(r.platformNotificationId!),
        ),
    );

    // Mark all as cancelled in store
    for (const r of scheduled) {
      store.markRecordStatus(r.id, 'cancelled', reason);
    }
  }

  // ── reconcileScheduledNotifications ────────────────────────────────────────

  async reconcileScheduledNotifications(
    approvedBundles: ApprovedNotificationBundle[],
    context?: NotificationDeliveryContext,
  ): Promise<ReconciliationResult> {
    const now = context?.now ?? new Date();
    const store = useNotificationDeliveryStore.getState();

    // Refresh permission state as a side effect of reconciliation
    const permission = await getNotificationPermissionState();
    store.setPermissionState(permission);

    if (permission !== 'granted' && permission !== 'provisional') {
      // No permission — return early without scheduling anything
      return {
        at: now,
        permissionState: permission,
        scheduled: [],
        cancelled: [],
        kept: store.records.filter((r) => r.deliveryStatus === 'scheduled'),
        expired: [],
        decisions: [],
        errors: [],
      };
    }

    // Compute the reconciliation plan (pure, no OS calls)
    const decisions = planNotificationReconciliation({
      approvedBundles,
      scheduledRecords: store.records,
      context,
    });

    const scheduled: ScheduledNotificationRecord[] = [];
    const cancelled: ScheduledNotificationRecord[] = [];
    const kept: ScheduledNotificationRecord[] = [];
    const expired: ScheduledNotificationRecord[] = [];
    const errors: Array<{ bundleId: string; message: string }> = [];

    const approvedById = new Map(approvedBundles.map((b) => [b.id, b]));

    for (const decision of decisions) {
      switch (decision.action) {
        case 'schedule_new': {
          const bundle = approvedById.get(decision.bundleId);
          if (!bundle) {
            errors.push({ bundleId: decision.bundleId, message: 'Bundle not found for schedule_new' });
            break;
          }
          const result = await this.scheduleApprovedBundle(bundle);
          if (result.ok) {
            scheduled.push(result.record);
          } else if (result.reason !== 'duplicate' && result.reason !== 'window_expired') {
            errors.push({ bundleId: decision.bundleId, message: result.message });
          }
          break;
        }

        case 'cancel_stale': {
          if (decision.recordId) {
            const record = store.records.find((r) => r.id === decision.recordId);
            if (record) {
              await this.cancelScheduledBundle(decision.bundleId, 'bundle_no_longer_approved');
              cancelled.push(record);
            }
          }
          break;
        }

        case 'reschedule_changed': {
          // Cancel old then schedule new
          if (decision.recordId) {
            const record = store.records.find((r) => r.id === decision.recordId);
            if (record) {
              await this.cancelScheduledBundle(decision.bundleId, 'content_changed');
              cancelled.push(record);
            }
          }
          const bundle = approvedById.get(decision.bundleId);
          if (bundle) {
            const result = await this.scheduleApprovedBundle(bundle);
            if (result.ok) scheduled.push(result.record);
          }
          break;
        }

        case 'expire_passed': {
          if (decision.recordId) {
            const record = store.records.find((r) => r.id === decision.recordId);
            if (record) {
              store.markRecordStatus(record.id, 'expired');
              expired.push(record);
            }
          }
          break;
        }

        case 'keep_existing': {
          if (decision.recordId) {
            const record = store.records.find((r) => r.id === decision.recordId);
            if (record) kept.push(record);
          }
          break;
        }
      }
    }

    return {
      at: now,
      permissionState: permission,
      scheduled,
      cancelled,
      kept,
      expired,
      decisions,
      errors,
    };
  }

  // ── getScheduledMeridianNotifications ───────────────────────────────────────

  async getScheduledMeridianNotifications(): Promise<ScheduledNotificationRecord[]> {
    return [...useNotificationDeliveryStore.getState().records];
  }
}
