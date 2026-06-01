import type { MeridianCalendarEvent } from '@/types/calendar';
import type { EventAttribution } from '@/types/attribution';
import type { LifeDomainId } from '@/types/life';
import { formatSourceCalendarDisplayLabel } from '@/services/calendar/sourceCalendarLabel';
import { buildPlanAttributionLine } from './planDisplay';
import { legacyFieldsFromAttribution, resolveEventAttribution } from './resolveEventAttribution';
import { rehydrateEventRelevance } from '@/services/relevance/rehydrateRelevance';
import { safeTrim } from '@/utils/safeString';

/** Fill attribution on persisted events cached before the attribution engine shipped. */
export function rehydrateEventAttribution(
  event: MeridianCalendarEvent,
): MeridianCalendarEvent {
  if (event.attribution?.sourceCalendarId) {
    const sourceCalendarDisplayLabel =
      event.sourceCalendarDisplayLabel ??
      formatSourceCalendarDisplayLabel(event.sourceCalendarName);

    const attribution = resolveEventAttribution({
      title: event.title,
      description: event.description,
      location: event.location,
      calendar: {
        sourceCalendarId: event.sourceCalendarId,
        sourceCalendarName: event.sourceCalendarName,
        sourceCalendarPrimary: event.sourceCalendarPrimary,
        sourceCalendarAccessRole: event.sourceCalendarAccessRole,
      },
      creator: event.creator,
      organizer: event.organizer,
      attendees: event.attendees,
      inferredCategory: event.inferredCategory,
    });

    const legacy = legacyFieldsFromAttribution(
      attribution,
      event.title,
      event.description,
    );

    const rawTitle = event.rawTitle ?? event.title;

    return rehydrateEventRelevance({
      ...event,
      attribution,
      rawTitle,
      title: rawTitle,
      displayTitle: event.displayTitle ?? rawTitle,
      displaySubtitle: event.displaySubtitle ?? sourceCalendarDisplayLabel,
      displayActivityType: event.displayActivityType ?? null,
      displayPersonLabel: event.displayPersonLabel ?? null,
      inferredLifeDomain: legacy.inferredLifeDomain,
      inferredOwnerLabel: legacy.inferredOwnerLabel,
      attributionLabel: legacy.attributionLabel,
      inferredCategory: legacy.inferredCategory,
      categoryConfidence: legacy.categoryConfidence,
      inferredPeople: legacy.inferredPeople,
      planAttributionLine: buildPlanAttributionLine(attribution),
    });
  }

  const sourceCalendarDisplayLabel =
    event.sourceCalendarDisplayLabel ??
    formatSourceCalendarDisplayLabel(event.sourceCalendarName);

  const attribution: EventAttribution = resolveEventAttribution({
    title: event.title,
    description: event.description,
    location: event.location,
    calendar: {
      sourceCalendarId: event.sourceCalendarId,
      sourceCalendarName: event.sourceCalendarName,
      sourceCalendarPrimary: event.sourceCalendarPrimary,
      sourceCalendarAccessRole: event.sourceCalendarAccessRole,
    },
    creator: event.creator,
    organizer: event.organizer,
    attendees: event.attendees,
    inferredCategory: event.inferredCategory,
  });

  const legacy = legacyFieldsFromAttribution(
    attribution,
    event.title,
    event.description,
  );

  const rawTitle = event.rawTitle ?? event.title;

  return rehydrateEventRelevance({
    ...event,
    attribution,
    rawTitle,
    title: rawTitle,
    sourceCalendarDisplayLabel,
    displaySourceLabel: sourceCalendarDisplayLabel,
    inferredLifeDomain: legacy.inferredLifeDomain,
    inferredOwnerLabel: legacy.inferredOwnerLabel,
    attributionLabel: legacy.attributionLabel,
    inferredCategory: legacy.inferredCategory,
    categoryConfidence: legacy.categoryConfidence,
    inferredPeople: legacy.inferredPeople,
    displayTitle: event.displayTitle ?? rawTitle,
    displaySubtitle: sourceCalendarDisplayLabel,
    displayActivityType: event.displayActivityType ?? null,
    displayPersonLabel: event.displayPersonLabel ?? null,
    displayLabel: event.displayTitle ?? rawTitle,
    planAttributionLine: buildPlanAttributionLine(attribution),
  });
}

export function ensureLifeDomain(event: MeridianCalendarEvent): LifeDomainId {
  return event.inferredLifeDomain ?? event.attribution?.inferredDomain ?? 'personal';
}
