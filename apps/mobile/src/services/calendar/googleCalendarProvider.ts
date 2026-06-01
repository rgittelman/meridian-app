import type { MeridianCalendarEvent } from '@/types/calendar';
import {
  calendarNotFound,
  calendarWriteNotImplemented,
  type CalendarProvider,
} from './CalendarProvider';
import {
  fetchGoogleCalendarList,
  fetchGoogleEventDetail,
  syncAllCalendarEvents,
} from './googleCalendarApi';

export const googleCalendarProvider: CalendarProvider = {
  async getCalendars(accessToken) {
    return fetchGoogleCalendarList(accessToken);
  },

  async getEvents(accessToken, timeMin, timeMax) {
    const { weekEvents } = await syncAllCalendarEvents(accessToken);
    const min = new Date(timeMin).getTime();
    const max = new Date(timeMax).getTime();
    return weekEvents.filter(
      (e) => e.startTime.getTime() <= max && e.endTime.getTime() >= min,
    );
  },

  async getEventDetail(accessToken, eventId) {
    const event = await fetchGoogleEventDetail(accessToken, eventId);
    if (!event) {
      return calendarNotFound<MeridianCalendarEvent>('Event not found.');
    }
    return { ok: true, data: event };
  },

  createEvent: async () => calendarWriteNotImplemented<MeridianCalendarEvent>(),
  updateEvent: async () => calendarWriteNotImplemented<MeridianCalendarEvent>(),
  deleteEvent: async () => calendarWriteNotImplemented<void>(),
  createMeetEvent: async () => calendarWriteNotImplemented<MeridianCalendarEvent>(),
};
