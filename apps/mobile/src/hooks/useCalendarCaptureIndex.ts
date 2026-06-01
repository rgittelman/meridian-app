import { useMemo } from 'react';

import {
  buildCalendarCaptureIndex,
  mergeCalendarEvents,
  type CalendarCaptureIndex,
} from '@/services/relationships/calendarCaptureIndex';
import { useCalendarStore } from '@/store/calendarStore';
import { useCaptureStore } from '@/store/captureStore';

/** Shared O(1) event ↔ capture index for Plan, Life, and detail surfaces. */
export function useCalendarCaptureIndex(): CalendarCaptureIndex {
  const weekEvents = useCalendarStore((s) => s.weekEvents);
  const upcomingEvents = useCalendarStore((s) => s.upcomingEvents);
  const captures = useCaptureStore((s) => s.items);

  return useMemo(() => {
    const events = mergeCalendarEvents(weekEvents, upcomingEvents);
    return buildCalendarCaptureIndex(events, captures);
  }, [weekEvents, upcomingEvents, captures]);
}
