import type { LifeObject } from '@/types/capture';
import type { MeridianCalendarEvent } from '@/types/calendar';
import { logRelationshipMatch } from '@/services/calendar/calendarIntelligenceDebug';
import { applyCalendarLinkToLifeObject } from './applyCalendarLink';
import { filterEventsForPlan } from '@/services/calendar/eventFilters';
import { findBestCalendarMatch, scoreCaptureEventRelationship } from './scoreRelationship';

export function matchAndLinkCapture(
  item: LifeObject,
  events: MeridianCalendarEvent[],
): LifeObject {
  const linkable = filterEventsForPlan(events).filter(
    (e) => e.signalClassification === 'meaningful',
  );
  if (linkable.length === 0) return item;

  if (item.relationshipConfidence === 'high' && item.linkedCalendarEventId) {
    return item;
  }

  const candidates = linkable
    .map((event) => {
      const scored = scoreCaptureEventRelationship(item, event);
      return {
        eventTitle: event.displayLabel,
        score: scored.score,
        confidence: scored.confidence,
      };
    })
    .filter((c) => c.confidence !== 'low')
    .sort((a, b) => b.score - a.score);

  const match = findBestCalendarMatch(item, linkable);

  if (__DEV__) {
    logRelationshipMatch(item.raw, candidates, match);
  }

  if (!match) return item;

  return applyCalendarLinkToLifeObject(item, match);
}
