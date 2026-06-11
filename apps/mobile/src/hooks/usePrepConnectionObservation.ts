import { useMemo } from 'react';

import {
  observePrepConnection,
  type PrepConnectionObservation,
} from '@/services/engagement/observePrepConnection';
import { useCalendarCaptureIndex } from '@/hooks/useCalendarCaptureIndex';
import { useCalendarStore } from '@/store/calendarStore';

/**
 * O06 — Prep-to-Event Connection Observation
 *
 * Returns at most one observation for the soonest upcoming event with a
 * qualifying capture link, or null when:
 *  - Calendar data is stale / cached
 *  - No stored or high-confidence inferred link qualifies
 *  - The nearest eligible event is more than 6 days away
 */
export function usePrepConnectionObservation(): PrepConnectionObservation | null {
  const index = useCalendarCaptureIndex();
  const showingCached = useCalendarStore((s) => s.showingCached);

  return useMemo(() => {
    if (showingCached) return null;
    return observePrepConnection(index.resolvedLinks, index.eventsById, new Date());
  }, [index.resolvedLinks, index.eventsById, showingCached]);
}
