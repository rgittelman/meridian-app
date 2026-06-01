import type { Confidence } from '@/types/capture';
import type {
  CalendarEventAttendee,
  CalendarEventOrganizer,
  SourceCalendarMeta,
} from '@/types/calendar';
import type { CalendarNameSignals } from '@/services/context/inferCalendarContext';
import type { ItemCategory } from '@/services/priority/types';
import type { EventAttribution } from '@/types/attribution';
import { formatSourceCalendarDisplayLabel } from '@/services/calendar/sourceCalendarLabel';
import { buildEventInferenceContext } from './eventInferenceContext';
import { inferAffectedPeople } from './inferAffectedPeople';
import { inferEventDomain } from './inferDomain';
import { inferEventOwner } from './inferOwner';
import { logAttributionDiagnostics } from './attributionDebug';
import {
  isKnownPersonName,
  matchKnownPeopleInText,
} from '@/services/people/knownPeople';
import { safeTrim } from '@/utils/safeString';
import type { LifeDomainId } from '@/types/life';

export type ResolveAttributionInput = {
  title: string;
  description?: string;
  location?: string;
  calendar: SourceCalendarMeta;
  calendarSignals?: CalendarNameSignals;
  creator?: CalendarEventOrganizer;
  organizer?: CalendarEventOrganizer;
  attendees?: CalendarEventAttendee[];
  inferredCategory: ItemCategory | null;
};

function lifeDomainToItemCategory(domain: LifeDomainId): ItemCategory | null {
  switch (domain) {
    case 'work':
      return 'work';
    case 'family':
      return 'family';
    case 'health':
      return 'health';
    case 'community':
      return 'personal';
    case 'personal':
      return 'personal';
    default:
      return null;
  }
}

export function resolveEventAttribution(
  input: ResolveAttributionInput,
): EventAttribution {
  const sourceCalendarDisplayLabel = formatSourceCalendarDisplayLabel(
    input.calendar.sourceCalendarName,
  );
  const decisionLog: string[] = [];

  const inferenceCtx = buildEventInferenceContext({
    title: input.title,
    description: input.description,
    location: input.location,
    sourceCalendarName: input.calendar.sourceCalendarName,
    sourceCalendarDisplayLabel,
  });

  const domainResult = inferEventDomain({
    title: inferenceCtx.inferenceTitle,
    description: input.description,
    location: input.location,
    sourceCalendarName: input.calendar.sourceCalendarName,
    sourceCalendarDisplayLabel,
    calendarSignals: input.calendarSignals,
    inferredCategory: input.inferredCategory,
  });
  decisionLog.push(`domain: ${domainResult.domain} (${domainResult.reason})`);

  const ownerResult = inferEventOwner({
    title: inferenceCtx.inferenceTitle,
    description: input.description,
    location: input.location,
    creator: input.creator,
    organizer: input.organizer,
    attendees: input.attendees,
    calendarSignals: input.calendarSignals,
    sourceCalendarDisplayLabel,
    inferredDomain: domainResult.domain,
    youthSportsContext: inferenceCtx,
  });
  decisionLog.push(
    `owner: ${ownerResult.ownerType}${ownerResult.ownerDisplayName ? ` ${ownerResult.ownerDisplayName}` : ''} (${ownerResult.ownerConfidence})`,
  );

  const affectedResult = inferAffectedPeople({
    title: inferenceCtx.inferenceTitle,
    description: input.description,
    attendees: input.attendees,
    ownerType: ownerResult.ownerType,
    ownerPersonId: ownerResult.ownerPersonId,
    ownerDisplayName: ownerResult.ownerDisplayName,
  });
  decisionLog.push(`affected: ${affectedResult.reason} (${affectedResult.affected.length})`);

  const attribution: EventAttribution = {
    sourceCalendarId: input.calendar.sourceCalendarId,
    sourceCalendarName: input.calendar.sourceCalendarName,
    sourceCalendarDisplayLabel,

    ownerType: ownerResult.ownerType,
    ownerConfidence: ownerResult.ownerConfidence,
    ownerPersonId: ownerResult.ownerPersonId,
    ownerDisplayName: ownerResult.ownerDisplayName,

    affectedPeople: affectedResult.affected,

    inferredDomain: domainResult.domain,
    domainConfidence: domainResult.confidence,

    sourcePreferences: {},
  };

  if (__DEV__) {
    attribution.diagnostics = {
      ownerCandidates: ownerResult.candidates,
      domainReason: domainResult.reason,
      affectedReason: affectedResult.reason,
      decisionLog,
    };
    logAttributionDiagnostics(input.title, attribution);
  }

  return attribution;
}

/** Sync legacy calendar event fields from attribution (gradual migration). */
export function legacyFieldsFromAttribution(
  attribution: EventAttribution,
  title: string,
  description?: string,
): {
  inferredOwnerLabel: string | null;
  attributionLabel: string | null;
  inferredCategory: ItemCategory | null;
  categoryConfidence: Confidence;
  inferredPeople: Array<{ name: string; confidence: Confidence }>;
  inferredLifeDomain: LifeDomainId;
} {
  const text = [title, safeTrim(description)].filter(Boolean).join(' ');
  const textPeople = matchKnownPeopleInText(text).map((m) => ({
    name: m.name,
    confidence: m.confidence,
  }));

  for (const a of attribution.affectedPeople) {
    if (!textPeople.some((p) => p.name === a.displayName)) {
      textPeople.push({ name: a.displayName, confidence: a.confidence });
    }
  }

  let inferredOwnerLabel: string | null = null;
  if (
    attribution.ownerType === 'person' &&
    attribution.ownerDisplayName &&
    isKnownPersonName(attribution.ownerDisplayName) &&
    attribution.ownerConfidence !== 'low'
  ) {
    inferredOwnerLabel = attribution.ownerDisplayName;
  }

  return {
    inferredOwnerLabel,
    attributionLabel: attribution.sourceCalendarDisplayLabel,
    inferredCategory: lifeDomainToItemCategory(attribution.inferredDomain),
    categoryConfidence: attribution.domainConfidence,
    inferredPeople: textPeople.filter((p) => isKnownPersonName(p.name)),
    inferredLifeDomain: attribution.inferredDomain,
  };
}
