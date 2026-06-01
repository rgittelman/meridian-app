import type { LifeObject } from '@/types/capture';
import type { MeridianCalendarEvent } from '@/types/calendar';
import { isChildMorningCommitment } from './childMorningCommitment';

const MAX_BOOST = 0.28;

/**
 * Boosts resurfacing score when a capture is linked to an imminent calendar event.
 */
export function computeEventLinkedBoost(
  obj: LifeObject,
  events: MeridianCalendarEvent[],
  now = Date.now(),
): number {
  if (!obj.linkedCalendarEventId || obj.relationshipConfidence === 'low') {
    return 0;
  }

  const event = events.find((e) => e.id === obj.linkedCalendarEventId);
  if (!event) return 0;

  const hoursUntil = (event.startTime.getTime() - now) / 3_600_000;
  if (hoursUntil < -1) return 0;

  let boost = 0;

  switch (obj.relationshipType) {
    case 'prep_for_event':
      if (hoursUntil <= 36 && hoursUntil >= 0) boost = 0.22;
      if (hoursUntil <= 12) boost = 0.26;
      break;
    case 'bring_to_event':
      if (hoursUntil <= 8 && hoursUntil >= 0) boost = 0.28;
      break;
    case 'follow_up_from_event':
      if (hoursUntil <= -0.5 && hoursUntil >= -24) boost = 0.12;
      break;
    case 'work_related':
      if (hoursUntil <= 24 && hoursUntil >= 0) boost = 0.18;
      break;
    case 'community_related':
      if (hoursUntil <= 24 && hoursUntil >= 0) boost = 0.2;
      break;
    case 'person_related':
    case 'household_related':
    case 'timing_related':
      if (hoursUntil <= 6 && hoursUntil >= 0) boost = 0.15;
      break;
    default:
      if (hoursUntil <= 12 && hoursUntil >= 0) boost = 0.1;
  }

  if (obj.relationshipConfidence === 'medium') {
    boost *= 0.65;
  }

  if (
    isChildMorningCommitment(obj, event, now) &&
    hoursUntil > 0 &&
    hoursUntil <= 14 &&
    event.startTime.getHours() < 11
  ) {
    boost = Math.max(boost, hoursUntil <= 10 ? 0.26 : 0.2);
  }

  return Math.min(MAX_BOOST, boost);
}
