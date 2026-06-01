import type { MeridianCalendarEvent, SourceCalendarMeta } from '@/types/calendar';

export type CalendarWriteError = {
  code: 'NOT_IMPLEMENTED' | 'NOT_FOUND';
  message: string;
};

export type CalendarProviderResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: CalendarWriteError };

export interface CalendarProvider {
  getCalendars(accessToken: string): Promise<SourceCalendarMeta[]>;
  getEvents(
    accessToken: string,
    timeMin: string,
    timeMax: string,
  ): Promise<MeridianCalendarEvent[]>;
  getEventDetail(
    accessToken: string,
    eventId: string,
  ): Promise<CalendarProviderResult<MeridianCalendarEvent>>;
  createEvent(
    accessToken: string,
    _payload: unknown,
  ): Promise<CalendarProviderResult<MeridianCalendarEvent>>;
  updateEvent(
    accessToken: string,
    _eventId: string,
    _payload: unknown,
  ): Promise<CalendarProviderResult<MeridianCalendarEvent>>;
  deleteEvent(
    accessToken: string,
    _eventId: string,
  ): Promise<CalendarProviderResult<void>>;
  createMeetEvent(
    accessToken: string,
    _payload: unknown,
  ): Promise<CalendarProviderResult<MeridianCalendarEvent>>;
}

const NOT_IMPLEMENTED: CalendarWriteError = {
  code: 'NOT_IMPLEMENTED',
  message: 'Calendar write sync is not enabled yet.',
};

export function calendarWriteNotImplemented<T>(): CalendarProviderResult<T> {
  return { ok: false, error: NOT_IMPLEMENTED };
}

export function calendarNotFound<T>(message: string): CalendarProviderResult<T> {
  return { ok: false, error: { code: 'NOT_FOUND', message } };
}
