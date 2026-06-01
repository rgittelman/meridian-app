import type {
  CalendarEventAttendee,
  CalendarSignalClassification,
  MeridianCalendarEvent,
} from '@/types/calendar';
import type { GoogleApiEvent } from './normalizeEvent';
import { isHouseholdRelevant } from '@/services/relevance';
import { isSchoolCalendarSource } from '@/services/relevance/isSchoolSource';
import { safeLower, safeTrim } from '@/utils/safeString';

const CANCELLED_TITLE =
  /\b(?:\[?\s*)?(?:CANCELED|CANCELLED)(?:\s*\]?)?\b/i;

const NOISE_CALENDAR_PATTERNS = [
  'vacation club',
  'disney vacation',
  'holiday',
  'birthdays',
  'contacts',
  'weather',
  'phases of the moon',
  'weeknum',
];

const NOISE_TITLE_PATTERNS = [
  'member',
  'membership',
  'subscription',
  'newsletter',
  'promo',
  'marketing',
];

export type EventFilterDiagnostics = {
  cancelledEventsFiltered: number;
  declinedEventsFiltered: number;
  noiseFiltered: number;
  meaningfulEventsRetained: number;
};

export function isCancelledGoogleEvent(raw: GoogleApiEvent): boolean {
  if (safeLower(raw.status) === 'cancelled') return true;
  const title = safeTrim(raw.summary);
  return CANCELLED_TITLE.test(title);
}

export function isCancelledTitle(title: string | null | undefined): boolean {
  return CANCELLED_TITLE.test(safeTrim(title));
}

export function isDeclinedGoogleEvent(raw: GoogleApiEvent): boolean {
  const attendees = raw.attendees ?? [];
  return attendees.some(
    (a) => Boolean(a.self) && safeLower(a.responseStatus) === 'declined',
  );
}

export function isDeclinedMeridianEvent(event: MeridianCalendarEvent): boolean {
  return (event.attendees ?? []).some(
    (a) => a.self && safeLower(a.responseStatus) === 'declined',
  );
}

export function classifyEventSignal(
  event: MeridianCalendarEvent,
): CalendarSignalClassification {
  const calName = safeLower(event.sourceCalendarName);
  const title = safeLower(event.title);
  const desc = safeLower(event.description);

  if (NOISE_CALENDAR_PATTERNS.some((p) => calName.includes(p))) {
    return 'subscription_noise';
  }

  if (NOISE_TITLE_PATTERNS.some((p) => title.includes(p) || desc.includes(p))) {
    return 'subscription_noise';
  }

  if (
    title.includes('disney') &&
    (title.includes('club') || title.includes('member') || title.includes('vacation'))
  ) {
    return 'subscription_noise';
  }

  if (event.sourceCalendarAccessRole === 'freeBusyReader') {
    return 'reference_only';
  }

  const durationDays =
    (event.endTime.getTime() - event.startTime.getTime()) / 86_400_000;
  if (
    event.allDay &&
    durationDays >= 3 &&
    event.peopleImpact === 'NONE' &&
    !event.inferredPeople.length
  ) {
    return 'subscription_noise';
  }

  if (
    !event.sourceCalendarPrimary &&
    event.sourceCalendarAccessRole === 'reader' &&
    event.peopleImpact === 'NONE' &&
    event.confidence === 'low'
  ) {
    // Community obligations (e.g. BFSC board from a subscribed reader calendar) must
    // remain visible even when the general signal is weak.
    const isExplicitCommunity =
      event.inferredLifeDomain === 'community' ||
      event.attribution?.inferredDomain === 'community';
    if (!isExplicitCommunity) return 'low_signal';
  }

  if (event.relevance && !event.relevance.isRelevant) {
    return 'reference_only';
  }

  const schoolCal = isSchoolCalendarSource(
    event.sourceCalendarName,
    event.displaySourceLabel ?? event.sourceCalendarDisplayLabel,
  );
  if (schoolCal && event.relevance && !event.relevance.isRelevant) {
    return 'reference_only';
  }

  if (
    schoolCal &&
    event.peopleImpact === 'NONE' &&
    !event.inferredPeople.some((p) => p.confidence === 'high')
  ) {
    return 'reference_only';
  }

  return 'meaningful';
}

export function isVisibleOnPlan(event: MeridianCalendarEvent): boolean {
  return (
    event.signalClassification === 'meaningful' && isHouseholdRelevant(event)
  );
}

export function isVisibleOnFocus(event: MeridianCalendarEvent): boolean {
  return event.signalClassification === 'meaningful';
}

export function filterEventsForPlan(
  events: MeridianCalendarEvent[],
): MeridianCalendarEvent[] {
  return events.filter(isVisibleOnPlan);
}

export function filterEventsForFocus(
  events: MeridianCalendarEvent[],
): MeridianCalendarEvent[] {
  return events.filter(isVisibleOnFocus);
}
