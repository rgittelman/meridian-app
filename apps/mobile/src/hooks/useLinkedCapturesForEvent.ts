import { useMemo } from 'react';

import { linkedCapturesFromIndex } from '@/services/relationships/calendarCaptureIndex';
import { useCalendarCaptureIndex } from '@/hooks/useCalendarCaptureIndex';

export function useLinkedCapturesForEvent(eventId: string | null) {
  const index = useCalendarCaptureIndex();

  return useMemo(
    () => linkedCapturesFromIndex(index, eventId),
    [index, eventId],
  );
}
