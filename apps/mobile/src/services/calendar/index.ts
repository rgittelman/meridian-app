export {
  fetchWeekEvents,
  fetchUpcomingEvents,
  syncAllCalendarEvents,
  fetchGoogleCalendarList,
  CalendarFetchError,
} from './googleCalendarApi';
export { normalizeGoogleEvent, normalizeGoogleEvents } from './normalizeEvent';
export type { GoogleApiEvent } from './normalizeEvent';
export { dedupeCalendarEvents } from './dedupeEvents';
export { selectUpcomingForFocus } from './selectUpcomingForFocus';
export { processCalendarEvents } from './signalPipeline';
export {
  filterEventsForFocus,
  filterEventsForPlan,
  isVisibleOnFocus,
  isVisibleOnPlan,
  classifyEventSignal,
} from './eventFilters';
export type { CalendarProvider, CalendarProviderResult, CalendarWriteError } from './CalendarProvider';
export { calendarWriteNotImplemented, calendarNotFound } from './CalendarProvider';
export { googleCalendarProvider } from './googleCalendarProvider';
export { fetchGoogleEventDetail } from './googleCalendarApi';
export {
  logCalendarIntelligenceSummary,
  logFocusUpcomingSelection,
  logRelationshipMatch,
  logEventLinkedResurfacing,
  logDeferredRelink,
  logSignalQualityDiagnostics,
} from './calendarIntelligenceDebug';
