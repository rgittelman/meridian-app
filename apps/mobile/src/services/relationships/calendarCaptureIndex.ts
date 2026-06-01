import type { LifeObject } from '@/types/capture';
import type { Confidence } from '@/types/capture';
import type { MeridianCalendarEvent } from '@/types/calendar';
import type { RelationshipType } from '@/types/relationships';
import { filterEventsForPlan } from '@/services/calendar/eventFilters';
import { findBestCalendarMatch, scoreCaptureEventRelationship } from './scoreRelationship';
import { logCaptureRelationshipIndex } from '@/services/calendar/calendarIntelligenceDebug';

const PREP_RELATIONSHIP_TYPES: ReadonlySet<RelationshipType> = new Set([
  'prep_for_event',
  'bring_to_event',
]);

function isActiveCapture(capture: LifeObject): boolean {
  return capture.status !== 'done' && capture.status !== 'archived';
}

function confidenceRank(c: Confidence): number {
  switch (c) {
    case 'high':
      return 3;
    case 'medium':
      return 2;
    default:
      return 1;
  }
}

function relationshipPriority(type: RelationshipType | null | undefined): number {
  if (type === 'prep_for_event') return 4;
  if (type === 'bring_to_event') return 3;
  if (type === 'follow_up_from_event') return 2;
  return 1;
}

function emotionalRank(capture: LifeObject): number {
  const w = capture.parse.emotionalWeight?.value;
  switch (w) {
    case 'CRITICAL':
      return 4;
    case 'HIGH':
      return 3;
    case 'MEDIUM':
      return 2;
    case 'LOW':
      return 1;
    default:
      return 0;
  }
}

export type ResolvedCaptureLink = {
  capture: LifeObject;
  eventId: string;
  confidence: Confidence;
  relationshipType: RelationshipType | null;
  score: number;
  source: 'stored' | 'inferred';
};

export type CalendarCaptureIndex = {
  /** Linkable events indexed once — avoids repeated full-list scans. */
  eventsById: ReadonlyMap<string, MeridianCalendarEvent>;
  /** captureId → calendarEventId for O(1) reverse lookup. */
  eventIdByCaptureId: ReadonlyMap<string, string>;
  /** All active captures linked to an event (stored or inferred this pass). */
  byEventId: ReadonlyMap<string, readonly LifeObject[]>;
  /** Prep / bring captures only. */
  prepByEventId: ReadonlyMap<string, readonly LifeObject[]>;
  prepCountByEventId: ReadonlyMap<string, number>;
  /** Best capture id per event for `relatedLifeObjectId`. */
  primaryCaptureIdByEventId: ReadonlyMap<string, string>;
  resolvedLinks: readonly ResolvedCaptureLink[];
};

/** Dedupe week + upcoming calendar events for a single relationship pass. */
export function mergeCalendarEvents(
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

function resolveCaptureEventId(
  capture: LifeObject,
  linkableEvents: MeridianCalendarEvent[],
  eventsById: ReadonlyMap<string, MeridianCalendarEvent>,
  now: number,
): ResolvedCaptureLink | null {
  if (!isActiveCapture(capture)) return null;

  if (capture.linkedCalendarEventId && capture.relationshipConfidence !== 'low') {
    const eventId = capture.linkedCalendarEventId;
    if (!eventsById.has(eventId)) return null;
    return {
      capture,
      eventId,
      confidence: capture.relationshipConfidence ?? 'medium',
      relationshipType: capture.relationshipType ?? null,
      score: 1,
      source: 'stored',
    };
  }

  const match = findBestCalendarMatch(capture, linkableEvents, now);
  if (!match) return null;
  if (!eventsById.has(match.calendarEventId)) return null;

  return {
    capture,
    eventId: match.calendarEventId,
    confidence: match.confidence,
    relationshipType: match.relationshipType,
    score: match.score,
    source: 'inferred',
  };
}

function pickPrimaryCaptureId(
  captures: readonly LifeObject[],
  event: MeridianCalendarEvent | undefined,
  now: number,
): string | null {
  if (captures.length === 0) return null;
  if (captures.length === 1) return captures[0].id;

  let best = captures[0];
  let bestScore = -1;

  for (const capture of captures) {
    let rank =
      relationshipPriority(capture.relationshipType) * 100 +
      confidenceRank(capture.relationshipConfidence ?? 'low') * 10 +
      emotionalRank(capture) +
      capture.momentumValue * 5;

    if (event) {
      const scored = scoreCaptureEventRelationship(capture, event, now);
      rank += scored.score * 20;
    }

    if (rank > bestScore) {
      bestScore = rank;
      best = capture;
    }
  }

  return best.id;
}

/**
 * Single-pass index: event ↔ captures with forward and reverse maps.
 */
export function buildCalendarCaptureIndex(
  events: MeridianCalendarEvent[],
  captures: LifeObject[],
  now = Date.now(),
): CalendarCaptureIndex {
  const linkableEvents = filterEventsForPlan(events).filter(
    (e) => e.signalClassification === 'meaningful',
  );
  const eventsById = new Map(linkableEvents.map((e) => [e.id, e]));

  const byEventId = new Map<string, LifeObject[]>();
  const prepByEventId = new Map<string, LifeObject[]>();
  const eventIdByCaptureId = new Map<string, string>();
  const resolvedLinks: ResolvedCaptureLink[] = [];

  for (const capture of captures) {
    const resolved = resolveCaptureEventId(capture, linkableEvents, eventsById, now);
    if (!resolved) continue;

    resolvedLinks.push(resolved);
    eventIdByCaptureId.set(resolved.capture.id, resolved.eventId);

    const list = byEventId.get(resolved.eventId) ?? [];
    list.push(resolved.capture);
    byEventId.set(resolved.eventId, list);

    const isPrep =
      PREP_RELATIONSHIP_TYPES.has(resolved.relationshipType as RelationshipType) ||
      PREP_RELATIONSHIP_TYPES.has(capture.relationshipType as RelationshipType);

    if (isPrep) {
      const prepList = prepByEventId.get(resolved.eventId) ?? [];
      prepList.push(resolved.capture);
      prepByEventId.set(resolved.eventId, prepList);
    }
  }

  const prepCountByEventId = new Map<string, number>();
  const primaryCaptureIdByEventId = new Map<string, string>();

  for (const [eventId, linked] of byEventId) {
    const prepList = prepByEventId.get(eventId) ?? [];
    prepCountByEventId.set(eventId, prepList.length > 0 ? prepList.length : linked.length);

    const primary = pickPrimaryCaptureId(linked, eventsById.get(eventId), now);
    if (primary) primaryCaptureIdByEventId.set(eventId, primary);
  }

  const index: CalendarCaptureIndex = {
    eventsById,
    eventIdByCaptureId,
    byEventId,
    prepByEventId,
    prepCountByEventId,
    primaryCaptureIdByEventId,
    resolvedLinks,
  };

  if (__DEV__) {
    logCaptureRelationshipIndex(index);
  }

  return index;
}

/** Apply `relatedLifeObjectId` from the capture index onto event copies. */
export function applyCaptureLinksToEvents(
  events: MeridianCalendarEvent[],
  index: CalendarCaptureIndex,
): MeridianCalendarEvent[] {
  return events.map((event) => {
    const relatedId = index.primaryCaptureIdByEventId.get(event.id) ?? null;
    if (relatedId === event.relatedLifeObjectId) return event;
    return { ...event, relatedLifeObjectId: relatedId };
  });
}

export function enrichEventsWithCaptureRelationships(
  events: MeridianCalendarEvent[],
  captures: LifeObject[],
  now = Date.now(),
): { events: MeridianCalendarEvent[]; index: CalendarCaptureIndex } {
  const index = buildCalendarCaptureIndex(events, captures, now);
  return {
    events: applyCaptureLinksToEvents(events, index),
    index,
  };
}

/** Prep counts for Plan cards — uses the same index rules as Life. */
export function prepCountsMapFromIndex(
  index: CalendarCaptureIndex,
): Map<string, number> {
  return new Map(index.prepCountByEventId);
}

export function linkedCapturesFromIndex(
  index: CalendarCaptureIndex,
  eventId: string | null,
): LifeObject[] {
  if (!eventId) return [];
  return [...(index.byEventId.get(eventId) ?? [])];
}

export function eventForCaptureId(
  index: CalendarCaptureIndex,
  captureId: string | null | undefined,
): MeridianCalendarEvent | null {
  if (!captureId) return null;
  const eventId = index.eventIdByCaptureId.get(captureId);
  if (!eventId) return null;
  return index.eventsById.get(eventId) ?? null;
}
