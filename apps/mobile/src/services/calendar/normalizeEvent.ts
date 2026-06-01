import type {
  GoogleCalendarAccessRole,
  MeridianCalendarEvent,
  SourceCalendarMeta,
} from '@/types/calendar';
import { inferSignalsFromCalendarName } from '@/services/context/inferCalendarContext';
import {
  legacyFieldsFromAttribution,
  resolveEventAttribution,
} from '@/services/attribution';
import { buildPlanAttributionLine, buildPlanTitleLine } from '@/services/attribution/planDisplay';
import { evaluateEventRelevance } from '@/services/relevance';
import { applyEventDisplayToEvent } from '@/services/relevance/humanizeEventDisplay';
import { inferFromEvent } from '@/services/people/inferFromEvent';
import { classifyEventSignal } from './eventFilters';
import {
  parseConferenceData,
  parseGoogleAttendees,
  parseGooglePerson,
  parseGoogleStatus,
} from './parseGoogleFields';
import { safeTrim } from '@/utils/safeString';

export type GoogleApiEvent = {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  visibility?: string;
  recurrence?: string[];
  recurringEventId?: string;
  hangoutLink?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: Array<{
    email?: string;
    displayName?: string;
    responseStatus?: string;
    self?: boolean;
  }>;
  organizer?: { email?: string; displayName?: string; self?: boolean };
  creator?: { email?: string; displayName?: string; self?: boolean };
  conferenceData?: {
    conferenceId?: string;
    conferenceSolution?: { name?: string; key?: { type?: string } };
    entryPoints?: Array<{ entryPointType?: string; uri?: string }>;
  };
};

function parseAccessRole(role?: string): GoogleCalendarAccessRole {
  switch (role) {
    case 'owner':
    case 'writer':
    case 'reader':
    case 'freeBusyReader':
      return role;
    default:
      return 'unknown';
  }
}

function parseGoogleDate(
  start?: { dateTime?: string; date?: string },
  end?: { dateTime?: string; date?: string },
): { startTime: Date; endTime: Date; allDay: boolean } {
  const allDay = Boolean(start?.date && !start?.dateTime);
  const startIso = start?.dateTime ?? (start?.date ? `${start.date}T00:00:00` : null);
  const endIso = end?.dateTime ?? (end?.date ? `${end.date}T23:59:59` : null);

  const startTime = startIso ? new Date(startIso) : new Date();
  const endTime = endIso ? new Date(endIso) : new Date(startTime.getTime() + 3600_000);

  return { startTime, endTime, allDay };
}

function formatDisplayTime(start: Date, allDay: boolean): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eventDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const diffDays = Math.round((eventDay.getTime() - today.getTime()) / 86_400_000);

  if (allDay) {
    if (diffDays === 0) return 'All day';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays > 1 && diffDays < 7) {
      return start.toLocaleDateString(undefined, { weekday: 'short' });
    }
    return start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  const time = start.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (diffDays === 0) return time;
  if (diffDays === 1) return `Tomorrow ${time}`;
  if (diffDays > 1 && diffDays < 7) {
    const day = start.toLocaleDateString(undefined, { weekday: 'short' });
    return `${day} ${time}`;
  }
  return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${time}`;
}

export function normalizeGoogleEvent(
  raw: GoogleApiEvent,
  calendar: SourceCalendarMeta,
  relatedLifeObjectId: string | null = null,
): MeridianCalendarEvent | null {
  if (!raw.id) return null;

  const title = safeTrim(raw.summary, 'Untitled');
  const description = safeTrim(raw.description) || undefined;
  const location = safeTrim(raw.location) || undefined;
  const { startTime, endTime, allDay } = parseGoogleDate(raw.start, raw.end);

  const calendarSignals = inferSignalsFromCalendarName({
    sourceCalendarName: calendar.sourceCalendarName ?? 'Calendar',
    sourceCalendarPrimary: Boolean(calendar.sourceCalendarPrimary),
  });
  const creator = parseGooglePerson(raw.creator);
  const organizer = parseGooglePerson(raw.organizer);
  const inference = inferFromEvent({
    title,
    description,
    location,
    calendarSignals,
  });

  const attribution = resolveEventAttribution({
    title,
    description,
    location,
    calendar,
    calendarSignals,
    creator,
    organizer,
    attendees: parseGoogleAttendees(raw.attendees),
    inferredCategory: inference.inferredCategory,
  });

  const legacy = legacyFieldsFromAttribution(attribution, title, description);
  const displaySourceLabel = attribution.sourceCalendarDisplayLabel;

  const { conferenceData, meetingUrl } = parseConferenceData(
    raw.conferenceData,
    raw.hangoutLink,
  );

  const event: MeridianCalendarEvent = {
    id: `${calendar.sourceCalendarId}:${raw.id}`,
    rawGoogleEventId: raw.id,
    rawTitle: title,
    title,
    displayTitle: title,
    displaySubtitle: displaySourceLabel,
    displayActivityType: null,
    displayPersonLabel: null,
    startTime,
    endTime,
    allDay,
    location,
    description,
    status: parseGoogleStatus(raw.status),
    htmlLink: raw.htmlLink,
    attendees: parseGoogleAttendees(raw.attendees),
    organizer,
    creator,
    conferenceData,
    hangoutLink: raw.hangoutLink,
    meetingUrl,
    visibility: raw.visibility,
    recurrence: raw.recurrence,
    recurringEventId: raw.recurringEventId,
    calendarSource: 'google',
    sourceType: 'google_calendar',
    sourceCalendarId: calendar.sourceCalendarId,
    sourceCalendarName: calendar.sourceCalendarName,
    sourceCalendarPrimary: calendar.sourceCalendarPrimary,
    sourceCalendarAccessRole: parseAccessRole(calendar.sourceCalendarAccessRole),
    attribution,
    inferredPeople: legacy.inferredPeople,
    inferredOwnerLabel: legacy.inferredOwnerLabel,
    sourceCalendarDisplayLabel: displaySourceLabel,
    displaySourceLabel,
    relevance: {
      relevanceScore: 'medium',
      relevanceReason: 'pending',
      relevanceConfidence: 'low',
      householdImpact: 'none',
      matchedHouseholdMembers: [],
      sourceRole: 'commitment',
      isRelevant: true,
      preferences: {},
    },
    attributionLabel: legacy.attributionLabel,
    inferredLifeDomain: legacy.inferredLifeDomain,
    inferredCategory: legacy.inferredCategory,
    categoryConfidence: legacy.categoryConfidence,
    confidence: inference.confidence,
    peopleImpact: inference.peopleImpact,
    timingSensitivity: inference.timingSensitivity,
    emotionalWeight: inference.emotionalWeight,
    signalClassification: 'meaningful',
    relatedLifeObjectId,
    displayLabel: buildPlanTitleLine(title),
    planAttributionLine: buildPlanAttributionLine(attribution),
    displayTime: formatDisplayTime(startTime, allDay),
  };

  event.relevance = evaluateEventRelevance(event);
  event.signalClassification = classifyEventSignal(event);

  const displayed = applyEventDisplayToEvent(event);
  if (displayed.relevance?.diagnostics) {
    displayed.relevance.diagnostics.humanizedDisplayTitle =
      displayed.displayTitle !== displayed.rawTitle
        ? displayed.displayTitle
        : undefined;
  }
  return displayed;
}

export function normalizeGoogleEvents(
  items: GoogleApiEvent[],
  calendar: SourceCalendarMeta,
): MeridianCalendarEvent[] {
  return items
    .map((e) => normalizeGoogleEvent(e, calendar))
    .filter((e): e is MeridianCalendarEvent => e !== null)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}
