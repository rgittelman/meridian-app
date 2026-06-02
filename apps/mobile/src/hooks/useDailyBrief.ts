/**
 * Meridian — useDailyBrief
 *
 * Derives Morning Brief or Evening Preview content for the Focus screen card.
 * Uses the same pure content builders as the notification scheduler, so the
 * card always reflects current calendar data (not the frozen notification copy).
 *
 * Returns:
 *   - morning content: visible from 5 AM until 5 PM
 *   - evening content: visible from 7 PM until midnight
 *   - null outside those windows, or when no meaningful events exist
 */

import { useMemo } from 'react';

import {
  buildMorningBriefContent,
  buildEveningPreviewContent,
  type BriefContent,
} from '@/services/notifications/buildBriefContent';
import { useCalendarStore } from '@/store/calendarStore';
import type { MeridianCalendarEvent } from '@/types/calendar';

function mergeEvents(
  weekEvents: MeridianCalendarEvent[],
  upcomingEvents: MeridianCalendarEvent[],
): MeridianCalendarEvent[] {
  const seen = new Set<string>();
  const merged: MeridianCalendarEvent[] = [];
  for (const e of [...weekEvents, ...upcomingEvents]) {
    if (!seen.has(e.id)) {
      seen.add(e.id);
      merged.push(e);
    }
  }
  return merged;
}

export function useDailyBrief(): BriefContent | null {
  const weekEvents = useCalendarStore((s) => s.weekEvents);
  const upcomingEvents = useCalendarStore((s) => s.upcomingEvents);

  return useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    const allEvents = mergeEvents(weekEvents, upcomingEvents);

    // Morning brief window: 5 AM – 5 PM
    if (hour >= 5 && hour < 17) {
      return buildMorningBriefContent(allEvents, now);
    }

    // Evening preview window: 7 PM – midnight
    if (hour >= 19) {
      return buildEveningPreviewContent(allEvents, now);
    }

    return null;
  }, [weekEvents, upcomingEvents]);
}
