import type { MeridianCalendarEvent } from '@/types/calendar';
import type { ResolvedCaptureLink } from '@/services/relationships/calendarCaptureIndex';
import {
  peopleForEvent,
  stripPersonPrefixFromTitle,
} from '@/services/notifications/candidateHelpers';

export type PrepConnectionObservation = {
  text: string;
  eventId: string;
  eventTitle: string;
};

/**
 * O06 — Prep-to-Event Connection Observation
 *
 * Scans resolved capture↔event links and returns a personal observation sentence
 * when a high-confidence connection exists for an upcoming event within 6 days.
 * Returns at most one observation — the soonest qualifying event.
 *
 * Eligibility gates (in order):
 *  1. Caller must pass only fresh events (showingCached gate is the hook's responsibility).
 *  2. source === 'stored' → always eligible.
 *  3. source === 'inferred' → only when confidence === 'high'.
 *  4. Event must not have already started.
 *  5. Event must be within 6 calendar days.
 *  6. Capture title must be at least 3 characters (avoids rendering stub captures).
 */
export function observePrepConnection(
  resolvedLinks: readonly ResolvedCaptureLink[],
  eventsById: ReadonlyMap<string, MeridianCalendarEvent>,
  now: Date,
): PrepConnectionObservation | null {
  const eligible = resolvedLinks.filter(
    (link) =>
      link.source === 'stored' ||
      (link.source === 'inferred' && link.confidence === 'high'),
  );

  type Candidate = { link: ResolvedCaptureLink; event: MeridianCalendarEvent };

  const candidates: Candidate[] = eligible
    .flatMap((link): Candidate[] => {
      const event = eventsById.get(link.eventId);
      if (!event) return [];
      if (event.startTime <= now) return [];
      return [{ link, event }];
    })
    .sort((a, b) => a.event.startTime.getTime() - b.event.startTime.getTime());

  for (const { link, event } of candidates) {
    if ((link.capture.title?.trim() ?? '').length < 3) continue;

    const token = timingToken(event.startTime, now);
    if (!token) continue;

    const label = eventLabel(event);
    return {
      text: `Something you captured is connected to ${label} ${token}.`,
      eventId: event.id,
      eventTitle: event.displayTitle ?? event.title,
    };
  }

  return null;
}

function timingToken(eventStart: Date, now: Date): string | null {
  const eventDay = startOfDay(eventStart);
  const today = startOfDay(now);
  const daysDiff = Math.round(
    (eventDay.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
  );

  if (daysDiff < 0) return null;
  if (daysDiff > 6) return null;
  if (daysDiff === 0) return eventStart.getHours() >= 17 ? 'tonight' : 'today';
  if (daysDiff === 1) return 'tomorrow';
  return 'this week';
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function eventLabel(event: MeridianCalendarEvent): string {
  const rawTitle = event.displayTitle ?? event.title;
  const person = peopleForEvent(event)[0];
  if (!person) return rawTitle;
  const activity = stripPersonPrefixFromTitle(rawTitle, person);
  return `${person}'s ${activity}`;
}
