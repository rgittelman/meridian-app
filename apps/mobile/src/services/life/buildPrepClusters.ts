import type { PrepClusterSummary } from '@/types/life';
import type { CalendarCaptureIndex } from '@/services/relationships/calendarCaptureIndex';
import type { PrepIntelligenceSnapshot } from '@/types/prep';
import { buildPrepIntelligence } from '@/services/prep';
import { lifePrepSummaryLine } from '@/services/prep/prepLanguage';
import { safeTrim } from '@/utils/safeString';
import type { PrepReadinessState } from '@/types/prep';

const DEFAULT_MAX_CLUSTERS = 6;

export type BuildPrepClustersOptions = {
  eventIds?: ReadonlySet<string>;
  maxClusters?: number;
  /** Reuse an existing prep snapshot when Life + Plan share the same build pass */
  prepSnapshot?: PrepIntelligenceSnapshot;
};

function clusterToSummary(cluster: {
  eventTitle: string;
  linkedCaptures: { length: number };
  readiness: PrepReadinessState;
}): PrepClusterSummary {
  const linkedEventTitle = safeTrim(cluster.eventTitle);
  const captureCount = cluster.linkedCaptures.length;

  return {
    label: lifePrepSummaryLine(linkedEventTitle, cluster.readiness),
    captureCount,
    linkedEventTitle: linkedEventTitle || null,
    readinessLine: lifePrepSummaryLine(linkedEventTitle, cluster.readiness),
  };
}

/**
 * Life domain prep summaries — built from Event Prep Intelligence + capture index.
 */
export function buildPrepClusters(
  index: CalendarCaptureIndex,
  options: BuildPrepClustersOptions = {},
): PrepClusterSummary[] {
  const { eventIds, maxClusters = DEFAULT_MAX_CLUSTERS, prepSnapshot } = options;

  const snapshot =
    prepSnapshot ??
    buildPrepIntelligence([...index.eventsById.values()], index);

  let clusters = snapshot.clusters.filter((c) => {
    if (c.readiness === 'not_yet_relevant' && c.linkedCaptures.length === 0) {
      return false;
    }
    return c.window.isActive || c.linkedCaptures.length > 0;
  });

  if (eventIds) {
    clusters = clusters.filter((c) => eventIds.has(c.eventId));
  }

  clusters.sort((a, b) => b.priorityScore - a.priorityScore);

  return clusters.slice(0, maxClusters).map(clusterToSummary);
}

export function prepClustersForDomain(
  domainEventIds: Iterable<string | null | undefined>,
  index: CalendarCaptureIndex,
  prepSnapshot?: PrepIntelligenceSnapshot,
): PrepClusterSummary[] {
  const ids = new Set(
    [...domainEventIds].filter((id): id is string => typeof id === 'string' && id.length > 0),
  );
  if (ids.size === 0) return [];

  return buildPrepClusters(index, { eventIds: ids, prepSnapshot });
}
