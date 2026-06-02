import type { MeridianCalendarEvent } from '@/types/calendar';
import type { Confidence } from '@/types/capture';
import type { HouseholdImpactLevel } from '@/types/relevance';
import type {
  NotificationCandidate,
  NotificationCandidateType,
  NotificationTimingSensitivity,
} from '@/types/notification';
import type { LifeDomainId } from '@/types/life';
import { prepAwarenessPrimaryLabel } from '@/services/prep/prepLanguage';
import { safeTrim } from '@/utils/safeString';

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function peopleForEvent(event: MeridianCalendarEvent): string[] {
  const names = new Set<string>();
  if (event.displayPersonLabel) names.add(event.displayPersonLabel);
  if (event.inferredOwnerLabel) names.add(event.inferredOwnerLabel);
  for (const p of event.inferredPeople) {
    if (p.confidence !== 'low') names.add(p.name);
  }
  return [...names];
}

export function householdImpactFromEvent(event: MeridianCalendarEvent): HouseholdImpactLevel {
  return event.relevance?.householdImpact ?? 'none';
}

export function timingSensitivityFromEvent(
  event: MeridianCalendarEvent,
): NotificationTimingSensitivity {
  if (event.timingSensitivity === 'high') return 'high';
  if (event.timingSensitivity === 'medium') return 'medium';
  return 'low';
}

export function eventPrimaryLine(event: MeridianCalendarEvent): string {
  const title = safeTrim(event.displayTitle ?? event.title, 'Upcoming');
  const people = peopleForEvent(event);
  return prepAwarenessPrimaryLabel(title, people);
}

/**
 * Strips a leading person name from an event title to prevent duplication
 * when the title already embeds the person (e.g. "Hudson · Hockey Game" → "Hockey Game"
 * when person is "Hudson"). Handles both "Name · Rest" and "Name Rest" prefixes.
 */
export function stripPersonPrefixFromTitle(title: string, person: string): string {
  // "Hudson · Hockey Game" → "Hockey Game"
  const dotPattern = new RegExp(`^${person}\\s*[·•\\-]\\s*`, 'i');
  if (dotPattern.test(title)) return title.replace(dotPattern, '').trim();
  // "Hudson hockey" → "hockey" (bare space prefix)
  const spacePattern = new RegExp(`^${person}\\s+`, 'i');
  if (spacePattern.test(title)) return title.replace(spacePattern, '').trim();
  return title;
}

export function commitmentBriefLine(event: MeridianCalendarEvent): string {
  const person = peopleForEvent(event)[0];
  const rawTitle = safeTrim(event.displayTitle ?? event.title, 'commitment');
  const time = event.allDay ? 'all day' : event.displayTime?.toLowerCase() ?? '';

  if (person) {
    const title = stripPersonPrefixFromTitle(rawTitle, person);
    if (time.includes('tomorrow')) {
      return `${person} has ${title} tomorrow.`;
    }
    if (time) {
      return `${person} has ${title} ${time.includes('today') ? 'today' : time}.`;
    }
    return `${person} has ${title}.`;
  }

  if (time.includes('tomorrow')) return `${rawTitle} tomorrow.`;
  if (time) return `${rawTitle} ${time}.`;
  return `${rawTitle}.`;
}

type BuildCandidateInput = {
  id: string;
  type: NotificationCandidateType;
  event: MeridianCalendarEvent | null;
  captureIds?: string[];
  domain?: LifeDomainId | null;
  generatedAt: Date;
  windowStart: Date;
  windowEnd: Date;
  confidence: Confidence;
  interruptionReason: string;
  bundleKey: string;
  primaryLine: string;
  secondaryLine?: string | null;
  additionalLines?: string[];
  conflictRisk?: number;
  prepRelevance?: number;
  householdImpact?: HouseholdImpactLevel;
  timingSensitivity?: NotificationTimingSensitivity;
};

export function buildCandidate(input: BuildCandidateInput): NotificationCandidate {
  const event = input.event;
  return {
    id: input.id,
    type: input.type,
    sourceEventId: event?.id ?? null,
    sourceCaptureIds: input.captureIds ?? [],
    sourceDomain:
      input.domain ?? event?.attribution?.inferredDomain ?? event?.inferredLifeDomain ?? null,
    sourcePeople: event ? peopleForEvent(event) : [],
    generatedAt: input.generatedAt,
    targetWindowStart: input.windowStart,
    targetWindowEnd: input.windowEnd,
    householdImpact: input.householdImpact ?? (event ? householdImpactFromEvent(event) : 'none'),
    timingSensitivity:
      input.timingSensitivity ?? (event ? timingSensitivityFromEvent(event) : 'medium'),
    confidence: input.confidence,
    interruptionReason: input.interruptionReason,
    suppressionReason: null,
    bundleKey: input.bundleKey,
    primaryLine: input.primaryLine,
    secondaryLine: input.secondaryLine ?? null,
    additionalLines: input.additionalLines ?? [],
    conflictRisk: input.conflictRisk ?? 0,
    prepRelevance: input.prepRelevance ?? 0,
  };
}

export function windowForLocalHours(
  base: Date,
  startHour: number,
  endHour: number,
): { start: Date; end: Date } {
  const start = new Date(base);
  start.setHours(startHour, 0, 0, 0);
  const end = new Date(base);
  end.setHours(endHour, 0, 0, 0);
  return { start, end };
}

export function isWithinLocalHourWindow(now: Date, startHour: number, endHour: number): boolean {
  const h = now.getHours();
  return h >= startHour && h < endHour;
}
