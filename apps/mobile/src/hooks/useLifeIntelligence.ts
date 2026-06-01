import { useMemo } from 'react';

import { buildLifeIntelligence } from '@/services/life';
import { useCalendarStore } from '@/store/calendarStore';
import { useCaptureStore } from '@/store/captureStore';
import type { LifeIntelligenceSnapshot } from '@/types/life';

function mergeCalendarEvents(): ReturnType<typeof useCalendarStore.getState>['weekEvents'] {
  const { weekEvents, upcomingEvents } = useCalendarStore.getState();
  const seen = new Set<string>();
  const merged = [];
  for (const e of [...weekEvents, ...upcomingEvents]) {
    if (!seen.has(e.id)) {
      seen.add(e.id);
      merged.push(e);
    }
  }
  return merged;
}

export function useLifeIntelligence(): LifeIntelligenceSnapshot {
  const weekEvents = useCalendarStore((s) => s.weekEvents);
  const upcomingEvents = useCalendarStore((s) => s.upcomingEvents);
  const captures = useCaptureStore((s) => s.items);

  return useMemo(() => {
    const seen = new Set<string>();
    const events = [];
    for (const e of [...weekEvents, ...upcomingEvents]) {
      if (!seen.has(e.id)) {
        seen.add(e.id);
        events.push(e);
      }
    }
    return buildLifeIntelligence(events, captures);
  }, [weekEvents, upcomingEvents, captures]);
}

/** Non-reactive snapshot for resurfacing/orchestration in the same render tick. */
export function getLifeIntelligenceSnapshot(): LifeIntelligenceSnapshot {
  const captures = useCaptureStore.getState().items;
  return buildLifeIntelligence(mergeCalendarEvents(), captures);
}
