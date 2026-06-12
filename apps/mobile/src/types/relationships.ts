import type { Confidence } from '@/types/capture';

export type RelationshipType =
  | 'prep_for_event'
  | 'bring_to_event'
  | 'follow_up_from_event'
  | 'person_related'
  | 'timing_related'
  | 'household_related'
  | 'work_related'
  | 'community_related';

export type RelationshipSource = 'calendar_match' | 'stored';

/** Scored candidate before applying to a Life Object */
export type CalendarRelationshipMatch = {
  calendarEventId: string;
  eventTitle: string;
  sourceCalendarName: string;
  relationshipType: RelationshipType;
  confidence: Confidence;
  score: number;
  reason: string;
};
