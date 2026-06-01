import type {
  ApprovedNotificationBundle,
  NotificationDeliveryContext,
  NotificationDeliveryScheduler,
  NotificationPermissionState,
  ReconciliationResult,
  ScheduleBundleResult,
  ScheduledNotificationCancellationReason,
  ScheduledNotificationRecord,
} from '@/types/notificationDelivery';
import { isApprovedNotificationBundle } from '@/types/notificationDelivery';
import { planNotificationReconciliation } from './reconciliationPlan';

/**
 * Architecture placeholder — no OS scheduling, no permissions, no runtime delivery.
 * Safe to wire for reconciliation planning and verification without side effects.
 */
export class NoOpNotificationDeliveryScheduler implements NotificationDeliveryScheduler {
  readonly permissionState: NotificationPermissionState = 'unavailable';

  private records: ScheduledNotificationRecord[] = [];

  async scheduleApprovedBundle(
    bundle: ApprovedNotificationBundle,
  ): Promise<ScheduleBundleResult> {
    if (!isApprovedNotificationBundle(bundle)) {
      return {
        ok: false,
        reason: 'not_approved',
        message: 'Only intelligence-approved bundles may be scheduled.',
      };
    }

    return {
      ok: false,
      reason: 'permissions_unavailable',
      message: 'Delivery transport not implemented — architecture phase only.',
    };
  }

  async cancelScheduledBundle(
    bundleId: string,
    reason: ScheduledNotificationCancellationReason,
  ): Promise<void> {
    this.records = this.records.map((r) =>
      r.bundleId === bundleId
        ? {
            ...r,
            deliveryStatus: 'cancelled',
            cancellationReason: reason,
            updatedAt: new Date(),
          }
        : r,
    );
  }

  async cancelAllMeridianNotifications(
    reason: ScheduledNotificationCancellationReason = 'manual_clear',
  ): Promise<void> {
    this.records = this.records.map((r) => ({
      ...r,
      deliveryStatus: 'cancelled',
      cancellationReason: reason,
      updatedAt: new Date(),
    }));
  }

  async reconcileScheduledNotifications(
    approvedBundles: ApprovedNotificationBundle[],
    context?: NotificationDeliveryContext,
  ): Promise<ReconciliationResult> {
    const now = context?.now ?? new Date();
    const decisions = planNotificationReconciliation({
      approvedBundles,
      scheduledRecords: this.records,
      context,
    });

    return {
      at: now,
      permissionState: this.permissionState,
      scheduled: [],
      cancelled: [],
      kept: this.records.filter((r) => r.deliveryStatus === 'scheduled'),
      expired: [],
      decisions,
      errors: [],
    };
  }

  async getScheduledMeridianNotifications(): Promise<ScheduledNotificationRecord[]> {
    return [...this.records];
  }
}
