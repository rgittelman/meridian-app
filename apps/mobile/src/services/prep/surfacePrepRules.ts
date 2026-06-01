import type { PrepCluster } from '@/types/prep';
import { isHouseholdRelevant } from '@/services/relevance';

export type PrepSurfaceDecision = {
  shouldSurface: boolean;
  reason: string | null;
};

export function decidePrepSurfacing(
  cluster: PrepCluster,
  alreadySurfacedCount: number,
  maxSurfaced = 2,
): PrepSurfaceDecision {
  const { event, window, readiness, linkedCaptures } = cluster;

  if (!isHouseholdRelevant(event)) {
    return { shouldSurface: false, reason: 'low_relevance_event' };
  }

  if (readiness === 'not_yet_relevant') {
    return { shouldSurface: false, reason: 'prep_window_not_open' };
  }

  if (!window.isActive) {
    return { shouldSurface: false, reason: 'outside_prep_window' };
  }

  if (readiness === 'ready' && linkedCaptures.length === 0) {
    return { shouldSurface: false, reason: 'already_ready_no_context' };
  }

  if (readiness === 'ready' && linkedCaptures.length > 0) {
    const active = linkedCaptures.filter(
      (c) => c.status !== 'done' && c.status !== 'archived',
    );
    if (active.length === 0) {
      return { shouldSurface: false, reason: 'already_ready' };
    }
  }

  if (
    readiness === 'no_prep_detected' &&
    window.hoursUntilStart > 36 &&
    event.peopleImpact === 'NONE'
  ) {
    return { shouldSurface: false, reason: 'no_useful_prep_context' };
  }

  if (alreadySurfacedCount >= maxSurfaced) {
    return { shouldSurface: false, reason: 'focus_capacity' };
  }

  if (window.hoursUntilStart < -1) {
    return { shouldSurface: false, reason: 'event_passed' };
  }

  return { shouldSurface: true, reason: null };
}

export function applySurfacingToClusters(
  clusters: PrepCluster[],
  maxSurfaced = 2,
): PrepCluster[] {
  const sorted = [...clusters].sort((a, b) => b.priorityScore - a.priorityScore);
  let surfaced = 0;

  return sorted.map((cluster) => {
    const decision = decidePrepSurfacing(cluster, surfaced, maxSurfaced);
    if (decision.shouldSurface) surfaced += 1;
    return {
      ...cluster,
      shouldSurface: decision.shouldSurface,
      suppressionReason: decision.reason,
    };
  });
}
