/**
 * Meridian — useNotificationDelivery
 *
 * Phase B: lifecycle wiring for notification reconciliation.
 *
 * Triggers:
 * 1. App foreground (AppState → 'active') — ensures the OS scheduler
 *    reflects the current intelligence snapshot after the user returns.
 * 2. Calendar sync completion (syncVersion increments) — reschedules or
 *    cancels notifications when events change, are added, or are removed.
 *
 * Design:
 * - Holds one ExpoNotificationDeliveryScheduler instance for the session.
 * - Reads store state non-reactively via getNotificationIntelligenceSnapshot()
 *   so reconciliation runs are imperative, not on every render.
 * - Debounces concurrent triggers (500 ms) — app foreground and sync often
 *   fire close together; only one reconciliation run is needed.
 * - Never schedules notifications on its own initiative — only reconciles
 *   whatever the intelligence pipeline has already approved.
 * - No intelligence logic lives here. Intelligence is locked.
 *
 * What this does NOT do (deferred to later phases):
 * - Leave alert scheduling (Phase E)
 * - Morning brief / evening preview forward-scheduling (Phase F)
 * - Permission requests (Phase C)
 * - Settings / quiet hours enforcement (Phase C)
 */

import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { ExpoNotificationDeliveryScheduler } from '@/services/notifications/delivery';
import { shouldDeliverBundleForSettings } from '@/services/notifications/delivery/notificationSettingsFilter';
import { getNotificationIntelligenceSnapshot } from '@/hooks/useNotificationIntelligence';
import { isApprovedNotificationBundle } from '@/types/notificationDelivery';
import { useCalendarStore } from '@/store/calendarStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useNotificationSettingsStore } from '@/store/notificationSettingsStore';
import { useCaptureStore } from '@/store/captureStore';

/** Debounce window in ms — collapses foreground + sync triggers firing together. */
const RECONCILE_DEBOUNCE_MS = 500;

export function useNotificationDelivery(): void {
  // Singleton scheduler for this session — stable across renders.
  const scheduler = useRef<ExpoNotificationDeliveryScheduler | null>(null);
  if (scheduler.current === null) {
    scheduler.current = new ExpoNotificationDeliveryScheduler();
  }

  // Debounce ref — holds the pending setTimeout id.
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track previous AppState to detect background → foreground transitions.
  const prevAppState = useRef<AppStateStatus>(AppState.currentState);

  // ── Core reconcile function ─────────────────────────────────────────────────

  const reconcile = useCallback(async () => {
    if (!scheduler.current) return;

    // If the user has disabled notifications, cancel all Meridian-scheduled
    // notifications and skip reconciliation.
    if (!useNotificationSettingsStore.getState().enabled) {
      await scheduler.current.cancelAllMeridianNotifications('manual_clear');
      return;
    }

    // Build intelligence snapshot from current store state (non-reactive read).
    const snapshot = getNotificationIntelligenceSnapshot();
    const settings = useNotificationSettingsStore.getState();

    const approvedBundles = snapshot.approvedBundles
      .filter(isApprovedNotificationBundle)
      .filter((b) => shouldDeliverBundleForSettings(b.type, settings));

    if (__DEV__) {
      const total = snapshot.approvedBundles.filter(isApprovedNotificationBundle).length;
      const filtered = total - approvedBundles.length;
      if (filtered > 0) {
        console.log(`[NotificationDelivery] ${filtered}/${total} bundles filtered by category settings`);
      }
    }
    // Build context for the planner: event start times for change detection,
    // resolved captures for stale-notification cancellation.
    const { weekEvents, upcomingEvents } = useCalendarStore.getState();
    const allEvents = [...weekEvents, ...upcomingEvents];
    const eventStartTimes: Record<string, string> = {};
    for (const e of allEvents) {
      eventStartTimes[e.id] = e.startTime.toISOString();
    }

    const resolvedCaptureIds = new Set(
      useCaptureStore.getState().items
        .filter((i) => i.status === 'done' || i.status === 'archived')
        .map((i) => i.id),
    );

    await scheduler.current.reconcileScheduledNotifications(approvedBundles, {
      now: new Date(),
      lastAppOpenedAt: useNotificationStore.getState().lastAppOpenedAt,
      eventStartTimes,
      resolvedCaptureIds,
    });
  }, []);

  // ── Debounced trigger ───────────────────────────────────────────────────────

  const scheduleReconcile = useCallback(() => {
    if (debounceTimer.current !== null) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      debounceTimer.current = null;
      void reconcile();
    }, RECONCILE_DEBOUNCE_MS);
  }, [reconcile]);

  // ── Trigger 1: app foreground ───────────────────────────────────────────────

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const wasBackground =
        prevAppState.current === 'background' || prevAppState.current === 'inactive';
      if (wasBackground && next === 'active') {
        scheduleReconcile();
      }
      prevAppState.current = next;
    });

    // Also reconcile immediately on mount if the app is already active
    // (covers first-open and hot reloads in dev).
    if (AppState.currentState === 'active') {
      scheduleReconcile();
    }

    return () => {
      sub.remove();
      if (debounceTimer.current !== null) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [scheduleReconcile]);

  // ── Trigger 2: calendar sync completed ─────────────────────────────────────
  //
  // syncVersion increments in calendarStore after every successful syncEvents().
  // Watching it here fires reconciliation whenever events are updated —
  // new events get scheduled, moved events get rescheduled, deleted events
  // get cancelled by the planner's cancel_stale / expire_passed logic.

  const syncVersion = useCalendarStore((s) => s.syncVersion);

  useEffect(() => {
    if (syncVersion === 0) return; // skip initial mount (no sync has occurred)
    scheduleReconcile();
  }, [syncVersion, scheduleReconcile]);
}
