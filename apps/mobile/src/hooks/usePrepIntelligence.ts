import { useMemo } from 'react';

import { buildPrepIntelligence } from '@/services/prep';
import {
  buildCalendarCaptureIndex,
  enrichEventsWithCaptureRelationships,
} from '@/services/relationships/calendarCaptureIndex';
import { useCalendarStore } from '@/store/calendarStore';
import { useCaptureStore } from '@/store/captureStore';
import type { PrepIntelligenceSnapshot } from '@/types/prep';
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

const EMPTY_SNAPSHOT: PrepIntelligenceSnapshot = {
  generatedAt: new Date(0),
  clusters: [],
  byEventId: new Map(),
  surfacedForFocus: [],
  focusPrepOverflowCount: 0,
  planContextByEventId: new Map(),
};

export function usePrepIntelligence(): PrepIntelligenceSnapshot {
  const weekEvents = useCalendarStore((s) => s.weekEvents);
  const upcomingEvents = useCalendarStore((s) => s.upcomingEvents);
  const captures = useCaptureStore((s) => s.items);

  return useMemo(() => {
    const merged = mergeCalendarEvents(weekEvents, upcomingEvents);
    if (merged.length === 0) return EMPTY_SNAPSHOT;

    const { events, index } = enrichEventsWithCaptureRelationships(merged, captures);
    return buildPrepIntelligence(events, index);
  }, [weekEvents, upcomingEvents, captures]);
}

/** Non-reactive snapshot for the current render tick. */
export function getPrepIntelligenceSnapshot(): PrepIntelligenceSnapshot {
  const { weekEvents, upcomingEvents } = useCalendarStore.getState();
  const captures = useCaptureStore.getState().items;
  const merged = mergeCalendarEvents(weekEvents, upcomingEvents);
  if (merged.length === 0) return EMPTY_SNAPSHOT;

  const { events, index } = enrichEventsWithCaptureRelationships(merged, captures);
  return buildPrepIntelligence(events, index);
}
