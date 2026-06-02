import { useMemo } from 'react';

import { buildNotificationIntelligence } from '@/services/notifications';
import type { NotificationIntelligenceSnapshot } from '@/types/notification';
import { useCalendarStore } from '@/store/calendarStore';
import { useCaptureStore } from '@/store/captureStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useResurfacingStore } from '@/store/resurfacingStore';
import { useLocationStore } from '@/store/locationStore';
import type { MeridianCalendarEvent } from '@/types/calendar';

function mergeCalendarEvents(
  weekEvents: MeridianCalendarEvent[],
  upcomingEvents: MeridianCalendarEvent[],
): MeridianCalendarEvent[] {
  const seen = new Set<string>();
  const merged: MeridianCalendarEvent[] = [];
  for (const e of [...weekEvents, ...upcomingEvents]) {
    if (!seen.has(e.id)) {
      seen.add(e.id);
      merged.push(e);
    }
  }
  return merged;
}

const EMPTY_SNAPSHOT: NotificationIntelligenceSnapshot = {
  generatedAt: new Date(0),
  candidates: [],
  bundles: [],
  approvedBundles: [],
  auditLog: [],
};

/**
 * Composes calendar + captures + notification store into SEND/SUPPRESS decisions.
 * No push delivery — decision engine only.
 */
export function useNotificationIntelligence(): NotificationIntelligenceSnapshot {
  const weekEvents = useCalendarStore((s) => s.weekEvents);
  const upcomingEvents = useCalendarStore((s) => s.upcomingEvents);
  const captures = useCaptureStore((s) => s.items);

  const lastAppOpenedAt = useNotificationStore((s) => s.lastAppOpenedAt);
  const recentAwarenessAt = useNotificationStore((s) => s.recentAwarenessAt);
  const ignoredPatterns = useNotificationStore((s) => s.ignoredPatterns);
  const recoveryWindowUntil = useNotificationStore((s) => s.recoveryWindowUntil);
  const dailyCaps = useNotificationStore((s) => s.dailyCaps);

  const overloadRecoveryActive = useResurfacingStore(
    (s) => Object.keys(s.cooldowns).length >= 4,
  );

  const currentRegion = useLocationStore((s) => s.currentRegion);
  const smartLeaveTimingEnabled = useLocationStore((s) => s.smartLeaveTimingEnabled);

  return useMemo(() => {
    const merged = mergeCalendarEvents(weekEvents, upcomingEvents);
    if (merged.length === 0 && captures.length === 0) {
      return EMPTY_SNAPSHOT;
    }

    return buildNotificationIntelligence({
      events: merged,
      captures,
      context: {
        lastAppOpenedAt,
        recentAwarenessAt,
        ignoredPatterns,
        recoveryWindowUntil,
        overloadRecoveryActive,
        dailyCaps,
      },
      locationContext: { currentRegion, smartLeaveTimingEnabled },
    });
  }, [
    weekEvents,
    upcomingEvents,
    captures,
    lastAppOpenedAt,
    recentAwarenessAt,
    ignoredPatterns,
    recoveryWindowUntil,
    overloadRecoveryActive,
    dailyCaps,
    currentRegion,
    smartLeaveTimingEnabled,
  ]);
}

/** Non-reactive snapshot for the current tick (e.g. dev scripts). */
export function getNotificationIntelligenceSnapshot(): NotificationIntelligenceSnapshot {
  const { weekEvents, upcomingEvents } = useCalendarStore.getState();
  const captures = useCaptureStore.getState().items;
  const {
    lastAppOpenedAt,
    recentAwarenessAt,
    ignoredPatterns,
    recoveryWindowUntil,
    dailyCaps,
  } = useNotificationStore.getState();
  const cooldowns = useResurfacingStore.getState().cooldowns;
  const { currentRegion, smartLeaveTimingEnabled } = useLocationStore.getState();

  const merged = mergeCalendarEvents(weekEvents, upcomingEvents);
  if (merged.length === 0 && captures.length === 0) return EMPTY_SNAPSHOT;

  return buildNotificationIntelligence({
    events: merged,
    captures,
    context: {
      lastAppOpenedAt,
      recentAwarenessAt,
      ignoredPatterns,
      recoveryWindowUntil,
      overloadRecoveryActive: Object.keys(cooldowns).length >= 4,
      dailyCaps,
    },
    locationContext: { currentRegion, smartLeaveTimingEnabled },
  });
}
