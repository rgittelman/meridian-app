import type { CalendarLinkedObject, MeridianCalendarEvent } from '@/types/calendar';
import { isVisibleOnFocus } from '@/services/calendar/eventFilters';

/**
 * Maps a calendar event to an event-backed linked object for orchestration/resurfacing.
 * Awareness input only — not duplicated into capture store.
 */
export function calendarEventToLinkedObject(
  event: MeridianCalendarEvent,
): CalendarLinkedObject {
  const emotional = event.emotionalWeight;
  const primaryPerson = event.inferredPeople[0];

  return {
    id: `cal-${event.id}`,
    source: 'calendar',
    calendarEventId: event.id,
    rawGoogleEventId: event.rawGoogleEventId,
    title: event.title,
    objectType: 'event',
    createdAt: event.startTime,
    status: 'active',
    inferredOwnerLabel: event.inferredOwnerLabel,
    sourceCalendarDisplayLabel: event.sourceCalendarDisplayLabel,
    attributionLabel: event.attributionLabel,
    inferredLifeDomain: event.inferredLifeDomain,
    attribution: event.attribution,
    parse: {
      people: event.inferredPeople.map((p) => ({
        value: p.name,
        confidence: p.confidence,
        source: event.title,
      })),
      category: event.inferredCategory
        ? {
            value: event.inferredCategory,
            confidence: event.categoryConfidence,
            source: event.title,
          }
        : null,
      emotionalWeight: {
        value: emotional,
        confidence: event.confidence,
        source: event.title,
      },
      timing: {
        value: {
          label: event.displayTime,
          isoHint: event.startTime.toISOString(),
        },
        confidence: event.confidence,
        source: event.title,
      },
    },
    momentumValue:
      emotional === 'HIGH' ? 0.55 : emotional === 'MEDIUM' ? 0.4 : 0.25,
  };
}

/** Upcoming events within horizon that merit orchestration awareness */
export function calendarEventsForOrchestration(
  events: MeridianCalendarEvent[],
  horizonHours = 12,
  now = Date.now(),
): CalendarLinkedObject[] {
  const horizon = now + horizonHours * 3_600_000;
  return events
    .filter((e) => isVisibleOnFocus(e))
    .filter((e) => e.endTime.getTime() > now && e.startTime.getTime() <= horizon)
    .filter(
      (e) =>
        e.peopleImpact !== 'NONE' ||
        e.timingSensitivity === 'high' ||
        e.inferredCategory === 'work',
    )
    .map(calendarEventToLinkedObject);
}

export function calendarEventsToLinkedObjects(
  events: MeridianCalendarEvent[],
): CalendarLinkedObject[] {
  return events.map(calendarEventToLinkedObject);
}
