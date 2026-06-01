import type { MeridianCalendarEvent } from '@/types/calendar';
import { safeLower, safeTrim } from '@/utils/safeString';

function timeKey(d: Date): string {
  return d.toISOString();
}

function secondaryKey(e: MeridianCalendarEvent): string {
  const title = safeLower(e?.title);
  return `${title}|${timeKey(e.startTime)}|${timeKey(e.endTime)}`;
}

function pickPreferred(
  a: MeridianCalendarEvent,
  b: MeridianCalendarEvent,
): MeridianCalendarEvent {
  if (a.sourceCalendarPrimary && !b.sourceCalendarPrimary) return a;
  if (b.sourceCalendarPrimary && !a.sourceCalendarPrimary) return b;

  const roleRank = (r: string) =>
    r === 'owner' ? 4 : r === 'writer' ? 3 : r === 'reader' ? 2 : 1;
  if (roleRank(a.sourceCalendarAccessRole) > roleRank(b.sourceCalendarAccessRole)) {
    return a;
  }
  if (roleRank(b.sourceCalendarAccessRole) > roleRank(a.sourceCalendarAccessRole)) {
    return b;
  }
  return a;
}

/**
 * Removes duplicate events across calendars (same Google id or same title/time window).
 */
export function dedupeCalendarEvents(
  events: MeridianCalendarEvent[],
): MeridianCalendarEvent[] {
  const byGoogleId = new Map<string, MeridianCalendarEvent>();
  const bySecondary = new Map<string, MeridianCalendarEvent>();

  for (const event of events) {
    const gid = event.rawGoogleEventId;
    if (gid) {
      const existing = byGoogleId.get(gid);
      byGoogleId.set(gid, existing ? pickPreferred(existing, event) : event);
      continue;
    }

    const sk = secondaryKey(event);
    const existing = bySecondary.get(sk);
    bySecondary.set(sk, existing ? pickPreferred(existing, event) : event);
  }

  const merged = new Map<string, MeridianCalendarEvent>();

  for (const e of byGoogleId.values()) {
    merged.set(secondaryKey(e), e);
  }
  for (const e of bySecondary.values()) {
    const sk = secondaryKey(e);
    const existing = merged.get(sk);
    merged.set(sk, existing ? pickPreferred(existing, e) : e);
  }

  return [...merged.values()].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime(),
  );
}
