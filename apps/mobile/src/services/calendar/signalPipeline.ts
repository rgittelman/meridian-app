import type { MeridianCalendarEvent } from '@/types/calendar';
import type { GoogleApiEvent } from './normalizeEvent';
import { normalizeGoogleEvents } from './normalizeEvent';
import type { SourceCalendarMeta } from '@/types/calendar';
import { dedupeCalendarEvents } from './dedupeEvents';
import {
  isCancelledGoogleEvent,
  isDeclinedGoogleEvent,
  filterEventsForPlan,
  type EventFilterDiagnostics,
} from './eventFilters';
import { logSignalQualityDiagnostics } from './calendarIntelligenceDebug';

export type SignalPipelineResult = {
  planEvents: MeridianCalendarEvent[];
  allRetained: MeridianCalendarEvent[];
  diagnostics: EventFilterDiagnostics & {
    rawEventsFetched: number;
    peopleInferenceMatched: number;
    peopleInferenceSkipped: number;
    conferenceLinksDetected: number;
  };
};

export function processCalendarEvents(
  rawByCalendar: Array<{ calendar: SourceCalendarMeta; items: GoogleApiEvent[] }>,
): SignalPipelineResult {
  let rawEventsFetched = 0;
  let cancelledEventsFiltered = 0;
  let declinedEventsFiltered = 0;
  let peopleInferenceMatched = 0;
  let peopleInferenceSkipped = 0;
  let conferenceLinksDetected = 0;

  const normalized: MeridianCalendarEvent[] = [];

  for (const { calendar, items } of rawByCalendar) {
    const passing: GoogleApiEvent[] = [];
    for (const raw of items) {
      rawEventsFetched += 1;
      if (isCancelledGoogleEvent(raw)) {
        cancelledEventsFiltered += 1;
        continue;
      }
      if (isDeclinedGoogleEvent(raw)) {
        declinedEventsFiltered += 1;
        continue;
      }
      passing.push(raw);
    }
    normalized.push(...normalizeGoogleEvents(passing, calendar));
  }

  const deduped = dedupeCalendarEvents(normalized);

  for (const e of deduped) {
    if (e.inferredPeople.length > 0) {
      peopleInferenceMatched += 1;
    } else {
      peopleInferenceSkipped += 1;
    }
    if (e.meetingUrl) {
      conferenceLinksDetected += 1;
    }
  }

  const noiseFiltered = deduped.filter(
    (e) =>
      e.signalClassification === 'subscription_noise' ||
      e.signalClassification === 'reference_only',
  ).length;

  const relevanceFiltered = deduped.filter((e) => !e.relevance?.isRelevant).length;

  const planEvents = filterEventsForPlan(deduped);
  const meaningfulEventsRetained = planEvents.filter(
    (e) => e.signalClassification === 'meaningful',
  ).length;

  const diagnostics = {
    rawEventsFetched,
    cancelledEventsFiltered,
    declinedEventsFiltered,
    noiseFiltered,
    relevanceFiltered,
    meaningfulEventsRetained,
    peopleInferenceMatched,
    peopleInferenceSkipped,
    conferenceLinksDetected,
  };

  logSignalQualityDiagnostics(diagnostics);

  return {
    planEvents,
    allRetained: deduped,
    diagnostics,
  };
}
