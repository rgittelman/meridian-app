import type { LifeObject } from '@/types/capture';
import type { CalendarRelationshipMatch } from '@/types/relationships';

export function applyCalendarLinkToLifeObject(
  item: LifeObject,
  match: CalendarRelationshipMatch,
): LifeObject {
  return {
    ...item,
    linkedCalendarEventId: match.calendarEventId,
    linkedCalendarEventTitle: match.eventTitle,
    linkedCalendarEventSourceCalendar: match.sourceCalendarName,
    relationshipType: match.relationshipType,
    relationshipConfidence: match.confidence,
    relationshipReason: match.reason,
    relationshipCreatedAt: new Date(),
    relationshipSource: 'calendar_match',
  };
}
