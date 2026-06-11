import { useMemo } from 'react';

import {
  observeGradeChildAttribution,
  type GradeChildObservation,
} from '@/services/engagement/observeGradeChildAttribution';
import { useCalendarStore } from '@/store/calendarStore';

/**
 * O09 — Grade → Child Attribution
 *
 * Returns at most one observation for the current week, or null when:
 *  - Calendar data is stale / cached
 *  - No qualifying school event is found
 *  - Grade signal is ambiguous
 */
export function useGradeChildObservation(): GradeChildObservation | null {
  const weekEvents = useCalendarStore((s) => s.weekEvents);
  const showingCached = useCalendarStore((s) => s.showingCached);

  return useMemo(() => {
    if (showingCached) return null;
    return observeGradeChildAttribution(weekEvents);
  }, [weekEvents, showingCached]);
}
