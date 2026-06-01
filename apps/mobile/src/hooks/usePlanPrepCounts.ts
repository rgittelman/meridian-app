import { useMemo } from 'react';

import { prepCountsMapFromIndex } from '@/services/relationships/calendarCaptureIndex';
import { useCalendarCaptureIndex } from '@/hooks/useCalendarCaptureIndex';

/**
 * Maps calendar event id → count of linked prep/logistics captures.
 * Uses the shared capture index (no per-event O(n) scan).
 */
export function usePlanPrepCounts(): Map<string, number> {
  const index = useCalendarCaptureIndex();

  return useMemo(() => prepCountsMapFromIndex(index), [index]);
}
