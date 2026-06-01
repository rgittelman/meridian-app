import { useMemo } from 'react';

import { buildNotificationVerificationSnapshot } from '@/services/notifications/buildVerificationSnapshot';
import type { NotificationVerificationSnapshot } from '@/types/notification';
import { useCalendarStore } from '@/store/calendarStore';
import { useCaptureStore } from '@/store/captureStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useResurfacingStore } from '@/store/resurfacingStore';
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

const EMPTY: NotificationVerificationSnapshot = {
  intelligence: {
    generatedAt: new Date(0),
    candidates: [],
    bundles: [],
    approvedBundles: [],
    auditLog: [],
  },
  traces: [],
  feed: { generated: [], suppressed: [], bundled: [], approved: [] },
  bundlingReview: { before: [], after: [] },
  previewsByType: {},
  silenceReasons: ['No calendar or capture data connected yet.'],
  systemStatus: 'silent',
};

/**
 * Dev-only verification snapshot — real data, no delivery.
 */
export function useNotificationVerification(): NotificationVerificationSnapshot {
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

  return useMemo(() => {
    const merged = mergeCalendarEvents(weekEvents, upcomingEvents);

    return buildNotificationVerificationSnapshot(
      {
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
      },
      merged,
    );
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
  ]);
}
