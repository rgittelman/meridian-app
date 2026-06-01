import { useCallback, useState } from 'react';

import { ScreenContainer } from '@/components/ScreenContainer';
import { PlanWeekView } from '@/components/calendar/PlanWeekView';
import { PromotedCaptureDetailSheet } from '@/components/plan/PromotedCaptureDetailSheet';
import type { PlanPromotedCapture } from '@/types/plan';
import { EventDetailSheet } from '@/components/events/EventDetailSheet';
import { EventEditSheet } from '@/components/events/EventEditSheet';
import { useCalendar } from '@/hooks/useCalendar';
import { useLifeIntelligence } from '@/hooks/useLifeIntelligence';
import { usePlanPromotedCaptures } from '@/hooks/usePlanPromotedCaptures';
import { derivePlanWeekWhisper } from '@/services/life/planDomainTone';
import type { MeridianCalendarEvent } from '@/types/calendar';

export function PlanScreen() {
  const { status, events, continuityHint, configured, connect } = useCalendar();
  const lifeSnapshot = useLifeIntelligence();
  const promotedCaptures = usePlanPromotedCaptures();
  const weekWhisper = derivePlanWeekWhisper(lifeSnapshot);
  const connecting = status === 'loading';

  const [detailEvent, setDetailEvent] = useState<MeridianCalendarEvent | null>(null);
  const [editEvent, setEditEvent] = useState<MeridianCalendarEvent | null>(null);
  const [captureDetail, setCaptureDetail] = useState<PlanPromotedCapture | null>(null);

  const handleConnect = useCallback(() => {
    void connect();
  }, [connect]);

  const handleViewDetail = useCallback((event: MeridianCalendarEvent) => {
    setDetailEvent(event);
  }, []);

  const handleEdit = useCallback((event: MeridianCalendarEvent) => {
    setEditEvent(event);
  }, []);

  const handleEditFromDetail = useCallback((event: MeridianCalendarEvent) => {
    setDetailEvent(null);
    setEditEvent(event);
  }, []);

  return (
    <ScreenContainer scrollable testID="plan-screen">
      <PlanWeekView
        status={status}
        events={events}
        promotedCaptures={promotedCaptures}
        continuityHint={continuityHint}
        weekWhisper={weekWhisper}
        configured={configured}
        onConnect={handleConnect}
        connecting={connecting}
        onViewEventDetail={handleViewDetail}
        onEditEvent={handleEdit}
        onPromotedCapturePress={setCaptureDetail}
      />
      <PromotedCaptureDetailSheet
        visible={captureDetail !== null}
        capture={captureDetail}
        onClose={() => setCaptureDetail(null)}
      />
      <EventDetailSheet
        visible={detailEvent !== null}
        event={detailEvent}
        onClose={() => setDetailEvent(null)}
        onEdit={handleEditFromDetail}
      />
      <EventEditSheet
        visible={editEvent !== null}
        event={editEvent}
        onClose={() => setEditEvent(null)}
      />
    </ScreenContainer>
  );
}
