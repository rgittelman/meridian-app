import { logCalendarDebug, logGoogleTokenInfo, maskToken } from './calendarDebug';
import { logCalendarIntelligenceSummary } from './calendarIntelligenceDebug';
import { processCalendarEvents } from './signalPipeline';
import { normalizeGoogleEvent, type GoogleApiEvent } from './normalizeEvent';
import {
  isEventInPlanWindow,
  planForwardBounds,
} from '@/services/calendar/planBounds';
import type {
  CalendarSyncDiagnostics,
  GoogleCalendarAccessRole,
  MeridianCalendarEvent,
  SourceCalendarMeta,
} from '@/types/calendar';

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

type GoogleCalendarListEntry = {
  id: string;
  summary?: string;
  primary?: boolean;
  accessRole?: string;
  hidden?: boolean;
  deleted?: boolean;
};

export type CalendarFetchErrorCode =
  | 'CALENDAR_AUTH_EXPIRED'
  | 'CALENDAR_FETCH_FAILED'
  | 'CALENDAR_FORBIDDEN'
  | 'CALENDAR_NETWORK';

export class CalendarFetchError extends Error {
  readonly code: CalendarFetchErrorCode;
  readonly status: number;
  readonly responseBody: string;

  constructor(code: CalendarFetchErrorCode, status: number, responseBody: string) {
    super(code);
    this.name = 'CalendarFetchError';
    this.code = code;
    this.status = status;
    this.responseBody = responseBody;
  }
}

function upcomingBounds(hoursAhead = 48): { timeMin: string; timeMax: string } {
  const now = new Date();
  const end = new Date(now.getTime() + hoursAhead * 3600_000);
  return {
    timeMin: now.toISOString(),
    timeMax: end.toISOString(),
  };
}

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

async function calendarFetch(
  accessToken: string,
  path: string,
): Promise<{ ok: boolean; status: number; body: string }> {
  const url = `${CALENDAR_API}${path}`;

  logCalendarDebug('request', { url, token: maskToken(accessToken) });

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = await res.text();
    logCalendarDebug('response', { status: res.status, ok: res.ok, path });
    return { ok: res.ok, status: res.status, body };
  } catch (err) {
    logCalendarDebug('network error', {
      path,
      error: err instanceof Error ? err.message : String(err),
    });
    throw new CalendarFetchError(
      'CALENDAR_NETWORK',
      0,
      err instanceof Error ? err.message : String(err),
    );
  }
}

function assertGlobalAuth(status: number, body: string): void {
  if (status === 401) {
    throw new CalendarFetchError('CALENDAR_AUTH_EXPIRED', status, body);
  }
  if (status === 403) {
    throw new CalendarFetchError('CALENDAR_FORBIDDEN', status, body);
  }
}

export async function fetchGoogleCalendarList(
  accessToken: string,
): Promise<SourceCalendarMeta[]> {
  if (__DEV__) {
    await logGoogleTokenInfo(accessToken);
  }

  const { ok, status, body } = await calendarFetch(
    accessToken,
    '/users/me/calendarList?minAccessRole=freeBusyReader&showHidden=false',
  );

  assertGlobalAuth(status, body);

  if (!ok) {
    throw new CalendarFetchError('CALENDAR_FETCH_FAILED', status, body);
  }

  let json: { items?: GoogleCalendarListEntry[] };
  try {
    json = JSON.parse(body) as { items?: GoogleCalendarListEntry[] };
  } catch {
    throw new CalendarFetchError('CALENDAR_FETCH_FAILED', status, body);
  }

  const calendars: SourceCalendarMeta[] = [];

  for (const entry of json.items ?? []) {
    if (!entry.id || entry.deleted || entry.hidden) continue;

    calendars.push({
      sourceCalendarId: entry.id,
      sourceCalendarName: String(entry.summary ?? 'Calendar').trim() || 'Calendar',
      sourceCalendarPrimary: Boolean(entry.primary),
      sourceCalendarAccessRole: parseAccessRole(entry.accessRole),
    });
  }

  return calendars;
}

type PerCalendarResult =
  | { ok: true; items: GoogleApiEvent[] }
  | { ok: false; calendarId: string; status: number };

async function fetchEventsForCalendar(
  accessToken: string,
  calendar: SourceCalendarMeta,
  timeMin: string,
  timeMax: string,
): Promise<PerCalendarResult> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '80',
    showDeleted: 'false',
  });

  const calId = encodeURIComponent(calendar.sourceCalendarId);
  const path = `/calendars/${calId}/events?${params.toString()}`;

  const { ok, status, body } = await calendarFetch(accessToken, path);

  if (status === 401) {
    throw new CalendarFetchError('CALENDAR_AUTH_EXPIRED', status, body);
  }

  if (status === 403 || status === 404) {
    return { ok: false, calendarId: calendar.sourceCalendarId, status };
  }

  if (!ok) {
    return { ok: false, calendarId: calendar.sourceCalendarId, status };
  }

  let json: { items?: GoogleApiEvent[] };
  try {
    json = JSON.parse(body) as { items?: GoogleApiEvent[] };
  } catch {
    return { ok: false, calendarId: calendar.sourceCalendarId, status };
  }

  return { ok: true, items: json.items ?? [] };
}

export type MultiCalendarSyncResult = {
  events: MeridianCalendarEvent[];
  partial: boolean;
  diagnostics: CalendarSyncDiagnostics;
};

async function syncEventsInRange(
  accessToken: string,
  timeMin: string,
  timeMax: string,
): Promise<MultiCalendarSyncResult> {
  const calendars = await fetchGoogleCalendarList(accessToken);

  let calendarsSkipped = 0;
  let calendarsFailed = 0;
  const failedCalendarIds: string[] = [];
  const rawByCalendar: Array<{ calendar: SourceCalendarMeta; items: GoogleApiEvent[] }> =
    [];

  const results = await Promise.all(
    calendars.map((cal) => fetchEventsForCalendar(accessToken, cal, timeMin, timeMax)),
  );

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.ok) {
      rawByCalendar.push({ calendar: calendars[i], items: result.items });
    } else {
      if (result.status === 403 || result.status === 404) {
        calendarsSkipped += 1;
      } else {
        calendarsFailed += 1;
      }
      failedCalendarIds.push(result.calendarId);
    }
  }

  const pipeline = processCalendarEvents(rawByCalendar);
  const partial = calendarsFailed > 0 || failedCalendarIds.length > 0;

  const diagnostics: CalendarSyncDiagnostics = {
    calendarsFetched: calendars.length,
    calendarsSkipped,
    calendarsFailed,
    eventsFetched: pipeline.diagnostics.rawEventsFetched,
    eventsNormalized: pipeline.allRetained.length,
    eventsDeduped: pipeline.planEvents.length,
    failedCalendarIds,
    ...pipeline.diagnostics,
  };

  if (__DEV__) {
    logCalendarIntelligenceSummary(
      pipeline.diagnostics.rawEventsFetched,
      pipeline.planEvents,
      pipeline.planEvents.length,
      diagnostics,
    );
  }

  logCalendarDebug('multi-calendar sync', diagnostics);

  return { events: pipeline.planEvents, partial, diagnostics };
}

/** Read a single event by Meridian composite id `sourceCalendarId:googleEventId`. */
export async function fetchGoogleEventDetail(
  accessToken: string,
  meridianEventId: string,
): Promise<MeridianCalendarEvent | null> {
  const colon = meridianEventId.indexOf(':');
  if (colon < 1) return null;

  const calendarId = meridianEventId.slice(0, colon);
  const googleEventId = meridianEventId.slice(colon + 1);
  if (!googleEventId) return null;

  const calendars = await fetchGoogleCalendarList(accessToken);
  const calendar = calendars.find((c) => c.sourceCalendarId === calendarId);
  if (!calendar) return null;

  const path = `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`;
  const { ok, status, body } = await calendarFetch(accessToken, path);

  if (status === 401) {
    throw new CalendarFetchError('CALENDAR_AUTH_EXPIRED', status, body);
  }

  if (!ok) return null;

  let raw: GoogleApiEvent;
  try {
    raw = JSON.parse(body) as GoogleApiEvent;
  } catch {
    return null;
  }

  return normalizeGoogleEvent(raw, calendar);
}

export async function fetchWeekEvents(
  accessToken: string,
  reference = new Date(),
): Promise<MeridianCalendarEvent[]> {
  const { timeMin, timeMax } = planForwardBounds(reference);
  const { events } = await syncEventsInRange(accessToken, timeMin, timeMax);
  return events;
}

export async function fetchUpcomingEvents(
  accessToken: string,
  hoursAhead = 48,
): Promise<MeridianCalendarEvent[]> {
  const { timeMin, timeMax } = upcomingBounds(hoursAhead);
  const { events } = await syncEventsInRange(accessToken, timeMin, timeMax);
  const now = Date.now();
  return events.filter((e) => e.endTime.getTime() >= now);
}

/** Single pass for week + upcoming — avoids duplicate calendar list fetches */
export async function syncAllCalendarEvents(accessToken: string): Promise<{
  weekEvents: MeridianCalendarEvent[];
  upcomingEvents: MeridianCalendarEvent[];
  partial: boolean;
  diagnostics: CalendarSyncDiagnostics;
}> {
  const plan = planForwardBounds();
  const upcoming = upcomingBounds(96);

  const timeMin =
    plan.timeMin < upcoming.timeMin ? plan.timeMin : upcoming.timeMin;
  const timeMax =
    plan.timeMax > upcoming.timeMax ? plan.timeMax : upcoming.timeMax;

  const { events, partial, diagnostics } = await syncEventsInRange(
    accessToken,
    timeMin,
    timeMax,
  );

  const now = Date.now();
  const upcomingEnd = new Date(upcoming.timeMax).getTime();

  const weekEvents = events.filter((e) => isEventInPlanWindow(e));

  const upcomingEvents = events.filter(
    (e) => e.endTime.getTime() >= now && e.startTime.getTime() <= upcomingEnd,
  );

  return { weekEvents, upcomingEvents, partial, diagnostics };
}
