import type { Confidence } from '@/types/capture';
import type { EventAttribution } from '@/types/attribution';
import type { EventRelevance } from '@/types/relevance';
import type { LifeDomainId } from '@/types/life';
import type { EmotionalWeight, ItemCategory, PeopleImpact } from '@/services/priority/types';

/** User-visible connection status for continuity states */
export type CalendarConnectionStatus =
  | 'not_connected'
  | 'loading'
  | 'connected'
  | 'auth_failed'
  | 'token_expired'
  | 'offline'
  | 'partial_sync';

export type CalendarSource = 'google';

export type CalendarSourceType = 'google_calendar';

export type GoogleCalendarAccessRole =
  | 'owner'
  | 'writer'
  | 'reader'
  | 'freeBusyReader'
  | 'unknown';

export type GoogleEventStatus = 'confirmed' | 'tentative' | 'cancelled';

export type CalendarSignalClassification =
  | 'meaningful'
  | 'low_signal'
  | 'subscription_noise'
  | 'reference_only';

export type CalendarEventAttendee = {
  email?: string;
  displayName?: string;
  responseStatus?: string;
  self?: boolean;
};

export type CalendarEventOrganizer = {
  email?: string;
  displayName?: string;
  self?: boolean;
};

export type CalendarConferenceData = {
  type?: string;
  meetingUrl?: string;
  conferenceId?: string;
  providerLabel?: string;
};

/** Metadata from Google Calendar List API — inference signal, not shown raw in UI */
export type SourceCalendarMeta = {
  sourceCalendarId: string;
  sourceCalendarName: string;
  sourceCalendarPrimary: boolean;
  sourceCalendarAccessRole: GoogleCalendarAccessRole | string;
};

/** Dev-only sync + signal summary — never includes tokens */
export type CalendarSyncDiagnostics = {
  calendarsFetched: number;
  calendarsSkipped: number;
  calendarsFailed: number;
  eventsFetched: number;
  eventsNormalized: number;
  eventsDeduped: number;
  failedCalendarIds: string[];
  /** Calendars where MAX_PAGES was reached with a remaining nextPageToken — events beyond 2500 were silently dropped. */
  paginationTruncatedCalendarIds?: string[];
  rawEventsFetched?: number;
  cancelledEventsFiltered?: number;
  declinedEventsFiltered?: number;
  noiseFiltered?: number;
  meaningfulEventsRetained?: number;
  peopleInferenceMatched?: number;
  peopleInferenceSkipped?: number;
  conferenceLinksDetected?: number;
  relevanceFiltered?: number;
};

/**
 * Normalized Meridian calendar event — intelligence + UI consume this only.
 */
export type MeridianCalendarEvent = {
  id: string;
  rawGoogleEventId: string;
  /** Original Google calendar title */
  rawTitle: string;
  /** Same as rawTitle — backward compatibility */
  title: string;
  displayTitle: string;
  displaySubtitle: string;
  displayActivityType: string | null;
  displayPersonLabel: string | null;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  allDay: boolean;
  status: GoogleEventStatus;
  htmlLink?: string;
  attendees: CalendarEventAttendee[];
  organizer?: CalendarEventOrganizer;
  creator?: CalendarEventOrganizer;
  conferenceData?: CalendarConferenceData;
  hangoutLink?: string;
  meetingUrl?: string;
  visibility?: string;
  recurrence?: string[];
  recurringEventId?: string;
  calendarSource: CalendarSource;
  sourceType: CalendarSourceType;
  sourceCalendarId: string;
  sourceCalendarName: string;
  sourceCalendarPrimary: boolean;
  sourceCalendarAccessRole: GoogleCalendarAccessRole;
  /** Ownership & attribution engine output — source, owner, affected, domain separated */
  attribution: EventAttribution;
  inferredPeople: Array<{ name: string; confidence: Confidence }>;
  /** High-confidence person owner only — never default Ryan */
  inferredOwnerLabel: string | null;
  sourceCalendarDisplayLabel: string;
  /** Humanized label for UI — never raw email identifiers */
  displaySourceLabel: string;
  attributionLabel: string | null;
  relevance: EventRelevance;
  inferredLifeDomain: LifeDomainId;
  inferredCategory: ItemCategory | null;
  categoryConfidence: Confidence;
  confidence: Confidence;
  peopleImpact: PeopleImpact;
  timingSensitivity: 'low' | 'medium' | 'high';
  emotionalWeight: EmotionalWeight;
  signalClassification: CalendarSignalClassification;
  relatedLifeObjectId: string | null;
  /** Primary UI title — humanized when needed */
  displayLabel: string;
  /** Plan second line: "Family Calendar" or "Grace · Family Calendar" */
  planAttributionLine: string;
  /** Short time e.g. "5:15" or "Tomorrow" */
  displayTime: string;
};

/** Event-backed structure for orchestration / resurfacing (not a duplicate capture) */
export type CalendarLinkedObject = {
  id: string;
  source: 'calendar';
  calendarEventId: string;
  rawGoogleEventId: string;
  title: string;
  objectType: 'event';
  createdAt: Date;
  status: 'active';
  inferredOwnerLabel: string | null;
  sourceCalendarDisplayLabel: string;
  attributionLabel: string | null;
  inferredLifeDomain: LifeDomainId;
  attribution?: EventAttribution;
  parse: {
    people: Array<{ value: string; confidence: Confidence; source: string }>;
    category: { value: ItemCategory; confidence: Confidence; source: string } | null;
    emotionalWeight: { value: EmotionalWeight; confidence: Confidence; source: string } | null;
    timing: { value: { label: string; isoHint?: string }; confidence: Confidence; source: string };
  };
  momentumValue: number;
};
