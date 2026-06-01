/**
 * @deprecated Use services/attribution/resolveEventAttribution — kept for imports during migration.
 */
import type { Confidence } from '@/types/capture';
import type { CalendarEventOrganizer } from '@/types/calendar';
import type { CalendarNameSignals } from '@/services/context/inferCalendarContext';
import type { ItemCategory } from '@/services/priority/types';
import {
  legacyFieldsFromAttribution,
  resolveEventAttribution,
} from '@/services/attribution';
import { safeTrim } from '@/utils/safeString';

export type OwnershipInput = {
  title?: string | null;
  description?: string | null;
  sourceCalendarName: string;
  sourceCalendarId?: string;
  calendarSignals?: CalendarNameSignals;
  creator?: CalendarEventOrganizer;
  organizer?: CalendarEventOrganizer;
  inferredCategory: ItemCategory | null;
};

export type OwnershipResult = {
  inferredPeople: Array<{ name: string; confidence: Confidence }>;
  inferredOwnerLabel: string | null;
  sourceCalendarDisplayLabel: string;
  attributionLabel: string | null;
};

export function resolveEventOwnership(input: OwnershipInput): OwnershipResult {
  const attribution = resolveEventAttribution({
    title: safeTrim(input.title, 'Untitled'),
    description: input.description ?? undefined,
    calendar: {
      sourceCalendarId: input.sourceCalendarId ?? 'unknown',
      sourceCalendarName: input.sourceCalendarName,
      sourceCalendarPrimary: false,
      sourceCalendarAccessRole: 'unknown',
    },
    calendarSignals: input.calendarSignals,
    creator: input.creator,
    organizer: input.organizer,
    inferredCategory: input.inferredCategory,
  });

  const legacy = legacyFieldsFromAttribution(
    attribution,
    safeTrim(input.title),
    input.description ?? undefined,
  );

  return {
    inferredPeople: legacy.inferredPeople,
    inferredOwnerLabel: legacy.inferredOwnerLabel,
    sourceCalendarDisplayLabel: attribution.sourceCalendarDisplayLabel,
    attributionLabel: legacy.attributionLabel,
  };
}
