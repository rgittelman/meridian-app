import type { LifeObject } from '@/types/capture';
import type { MeridianCalendarEvent } from '@/types/calendar';
import type { RelationshipType } from '@/types/relationships';
import { safeLower, safeString } from '@/utils/safeString';

const PREP_WORDS = /\b(?:prep(?:are)?|review|notes?|deck|slides|materials|agenda|read)\b/i;
const BRING_WORDS = /\b(?:bring|pack|grab|load|skates|gear|uniform|equipment|cleats)\b/i;
const PRINT_WORDS = /\b(?:print|forms?|paperwork|permission)\b/i;
const FOLLOW_UP = /\b(?:follow\s*up|after|debrief|thank\s*you|recap)\b/i;

export function inferRelationshipType(
  capture: LifeObject,
  event: MeridianCalendarEvent,
): RelationshipType {
  const text = safeLower(capture?.raw);
  const eventLower = safeLower(event?.title ?? event?.displayLabel);

  if (PREP_WORDS.test(text)) return 'prep_for_event';
  if (BRING_WORDS.test(text)) return 'bring_to_event';
  if (PRINT_WORDS.test(text)) return 'prep_for_event';
  if (FOLLOW_UP.test(text)) return 'follow_up_from_event';

  if (event.inferredCategory === 'work' || capture.parse.category?.value === 'work') {
    return 'work_related';
  }

  if (
    safeLower(event?.sourceCalendarName).includes('bfsc') ||
    eventLower.includes('board') ||
    eventLower.includes('bfsc')
  ) {
    return 'community_related';
  }

  if (
    capture.parse.category?.value === 'family' ||
    event.inferredCategory === 'family' ||
    event.inferredCategory === 'household'
  ) {
    return capture.parse.people.length > 0 ? 'person_related' : 'household_related';
  }

  if (capture.parse.timing || event.timingSensitivity === 'high') {
    return 'timing_related';
  }

  return 'person_related';
}
