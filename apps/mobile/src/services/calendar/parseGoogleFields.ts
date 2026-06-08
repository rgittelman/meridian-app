import type {
  CalendarConferenceData,
  CalendarEventAttendee,
  CalendarEventOrganizer,
  GoogleEventStatus,
} from '@/types/calendar';
import type { GoogleApiEvent } from './normalizeEvent';
import { safeTrim } from '@/utils/safeString';

export function parseGoogleStatus(status?: string): GoogleEventStatus {
  if (status === 'tentative') return 'tentative';
  if (status === 'cancelled') return 'cancelled';
  return 'confirmed';
}

export function parseGoogleAttendees(
  raw?: GoogleApiEvent['attendees'],
): CalendarEventAttendee[] {
  if (!raw?.length) return [];
  return raw.map((a) => ({
    email: a.email,
    displayName: a.displayName,
    responseStatus: a.responseStatus,
    self: a.self,
  }));
}

export function parseGooglePerson(
  raw?: { email?: string; displayName?: string; self?: boolean },
): CalendarEventOrganizer | undefined {
  if (!raw) return undefined;
  return {
    email: raw.email,
    displayName: raw.displayName,
    self: raw.self,
  };
}

/**
 * Extracts a Microsoft Teams join URL from a calendar event description.
 * Teams invites embed the URL as <https://teams.microsoft.com/l/meetup-join/...>
 * in the description text rather than using Google's conferenceData structure.
 */
export function extractTeamsUrlFromDescription(description?: string): string | undefined {
  if (!description) return undefined;
  const match = description.match(
    /<?(https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^\s<>]+)>?/i,
  );
  return match?.[1];
}

export function parseConferenceData(
  raw?: GoogleApiEvent['conferenceData'],
  hangoutLink?: string,
): { conferenceData?: CalendarConferenceData; meetingUrl?: string } {
  let meetingUrl = safeTrim(hangoutLink) || undefined;

  if (!raw && !meetingUrl) {
    return {};
  }

  const videoEntry = raw?.entryPoints?.find(
    (e) => e.entryPointType === 'video' && e.uri,
  );
  if (videoEntry?.uri) {
    meetingUrl = videoEntry.uri;
  }

  if (!meetingUrl && !raw) {
    return {};
  }

  const providerLabel =
    raw?.conferenceSolution?.name ??
    (meetingUrl?.includes('meet.google') ? 'Google Meet' : undefined);

  return {
    meetingUrl,
    conferenceData: {
      type: raw?.conferenceSolution?.key?.type ?? 'hangoutsMeet',
      meetingUrl,
      conferenceId: raw?.conferenceId,
      providerLabel: providerLabel ?? (meetingUrl ? 'Google Meet' : undefined),
    },
  };
}
