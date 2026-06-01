import type { MeridianCalendarEvent } from '@/types/calendar';
import type { LifeObject } from '@/types/capture';
import type {
  PrepAwarenessItem,
  PrepCluster,
  PrepIntelligenceSnapshot,
  PlanPrepContext,
} from '@/types/prep';
import type { LifeDomainId } from '@/types/life';
import type { CalendarCaptureIndex } from '@/services/relationships/calendarCaptureIndex';
import { filterEventsForPlan } from '@/services/calendar/eventFilters';
import { assignDomainFromEvent } from '@/services/life/assignDomain';
import { isHouseholdRelevant } from '@/services/relevance';
import { isKnownPersonName } from '@/services/people/knownPeople';
import { buildPreparationWindow, eventTimingHeadline } from './preparationWindow';
import { readinessFromEventAndCaptures } from './readinessState';
import {
  focusPrepBody,
  planPrepLine,
  prepAwarenessContextLine,
  prepAwarenessPrimaryLabel,
  prepConnectedSummary,
} from './prepLanguage';
import { scorePrepCluster } from './prioritizePrepCluster';
import { applySurfacingToClusters } from './surfacePrepRules';
import {
  PREP_FOCUS_AWARENESS_ENABLED,
  PREP_UI_SURFACING_ENABLED,
} from './constants';
import { logPrepIntelligenceDiagnostics } from './prepDebug';
import { safeTrim } from '@/utils/safeString';

const FOCUS_PREP_MAX = 2;

function peopleContextForEvent(event: MeridianCalendarEvent): string[] {
  const names = new Set<string>();

  if (
    event.attribution?.ownerType === 'person' &&
    event.attribution.ownerDisplayName &&
    isKnownPersonName(event.attribution.ownerDisplayName)
  ) {
    names.add(event.attribution.ownerDisplayName);
  }

  for (const p of event.inferredPeople) {
    if (p.confidence !== 'low' && isKnownPersonName(p.name)) {
      names.add(p.name);
    }
  }

  for (const a of event.attribution?.affectedPeople ?? []) {
    if (isKnownPersonName(a.displayName)) names.add(a.displayName);
  }

  if (event.displayPersonLabel && isKnownPersonName(event.displayPersonLabel)) {
    names.add(event.displayPersonLabel);
  }

  return [...names];
}

function buildSingleCluster(
  event: MeridianCalendarEvent,
  linkedCaptures: readonly LifeObject[],
  now: number,
): PrepCluster {
  const window = buildPreparationWindow(event, now);
  const readiness = readinessFromEventAndCaptures(linkedCaptures, window);
  const domainId =
    event.attribution?.inferredDomain ??
    assignDomainFromEvent(event).domainId;

  const base: PrepCluster = {
    id: `prep-${event.id}`,
    eventId: event.id,
    event,
    eventTitle: safeTrim(event.displayTitle ?? event.title, 'Event'),
    domainId,
    linkedCaptures: [...linkedCaptures],
    relatedCaptureIds: linkedCaptures.map((c) => c.id),
    peopleContext: peopleContextForEvent(event),
    readiness,
    window,
    priorityScore: 0,
    shouldSurface: false,
    suppressionReason: null,
  };

  base.priorityScore = scorePrepCluster(event, base);
  return base;
}

function toFocusAwareness(cluster: PrepCluster): PrepAwarenessItem {
  const hasBring = cluster.linkedCaptures.some(
    (c) => c.relationshipType === 'bring_to_event',
  );
  const activeCount = cluster.linkedCaptures.filter(
    (c) => c.status !== 'done' && c.status !== 'archived',
  ).length;

  let body = focusPrepBody(cluster.readiness, activeCount, cluster.event);
  if (hasBring && cluster.readiness === 'mostly_ready') {
    body = 'Equipment reminder captured.';
  } else if (hasBring && cluster.readiness === 'ready') {
    body = 'Equipment reminder captured.';
  }

  const contextLine = prepAwarenessContextLine(cluster.event);

  return {
    id: cluster.id,
    eventId: cluster.eventId,
    eventTitle: cluster.eventTitle,
    primaryLabel: prepAwarenessPrimaryLabel(
      cluster.eventTitle,
      cluster.peopleContext,
    ),
    contextLine: contextLine || cluster.eventTitle,
    body,
    connectedSummary: prepConnectedSummary(activeCount),
    readiness: cluster.readiness,
  };
}

/**
 * Builds prep clusters, readiness, prioritization, and surface decisions for all consumers.
 */
export function buildPrepIntelligence(
  events: MeridianCalendarEvent[],
  index: CalendarCaptureIndex,
  now = Date.now(),
): PrepIntelligenceSnapshot {
  const candidates = filterEventsForPlan(events).filter(
    (e) =>
      e.signalClassification === 'meaningful' &&
      isHouseholdRelevant(e) &&
      e.endTime.getTime() >= now,
  );

  const rawClusters: PrepCluster[] = [];

  for (const event of candidates) {
    const linked = index.byEventId.get(event.id) ?? [];
    rawClusters.push(buildSingleCluster(event, linked, now));
  }

  const clusters = applySurfacingToClusters(rawClusters, FOCUS_PREP_MAX + 1);

  const byEventId = new Map(clusters.map((c) => [c.eventId, c]));

  const planContextByEventId = new Map<string, PlanPrepContext>();
  if (PREP_UI_SURFACING_ENABLED) {
    for (const cluster of clusters) {
      const activeCount = cluster.linkedCaptures.filter(
        (c) => c.status !== 'done' && c.status !== 'archived',
      ).length;
      planContextByEventId.set(cluster.eventId, {
        line: planPrepLine(cluster.readiness, activeCount, cluster.window),
        readiness: cluster.readiness,
      });
    }
  }

  const focusEligible = clusters.filter((c) => c.shouldSurface);
  const surfacedForFocus = PREP_FOCUS_AWARENESS_ENABLED
    ? focusEligible.slice(0, FOCUS_PREP_MAX).map((c) => toFocusAwareness(c))
    : [];
  const focusPrepOverflowCount = PREP_FOCUS_AWARENESS_ENABLED
    ? Math.max(0, focusEligible.length - surfacedForFocus.length)
    : 0;

  if (__DEV__ && (PREP_UI_SURFACING_ENABLED || PREP_FOCUS_AWARENESS_ENABLED)) {
    logPrepIntelligenceDiagnostics(clusters, surfacedForFocus, now);
  }

  return {
    generatedAt: new Date(now),
    clusters,
    byEventId,
    surfacedForFocus,
    focusPrepOverflowCount,
    planContextByEventId,
  };
}

export function prepClusterForEvent(
  snapshot: PrepIntelligenceSnapshot,
  eventId: string | null | undefined,
): PrepCluster | null {
  if (!eventId) return null;
  return snapshot.byEventId.get(eventId) ?? null;
}
