import type { MeridianCalendarEvent } from '@/types/calendar';
import type { PrepCluster } from '@/types/prep';
import { filterEventsForPlan } from '@/services/calendar/eventFilters';
import { isHouseholdRelevant } from '@/services/relevance';
import { buildCandidate, dayKey, eventPrimaryLine } from './candidateHelpers';
import type { NotificationCandidate } from '@/types/notification';
import type { NotificationGeneratorOptions } from './generatorOptions';
import { prepAwarenessContextLine } from '@/services/prep/prepLanguage';
import { focusPrepBody } from '@/services/prep/prepLanguage';

/**
 * Transition awareness — event primary, prep secondary, actionable windows only.
 */
export function generateTransitionAwarenessCandidates(
  events: MeridianCalendarEvent[],
  prepClusters: PrepCluster[],
  now = new Date(),
  options?: NotificationGeneratorOptions,
): NotificationCandidate[] {
  const candidates: NotificationCandidate[] = [];
  const planEvents = filterEventsForPlan(events);

  for (const cluster of prepClusters) {
    if (!options?.bypassDeliveryWindow) {
      if (!cluster.shouldSurface && cluster.window.isActive === false) continue;
      if (!cluster.window.isActive) continue;
    } else if (!cluster.window.isActive && cluster.readiness === 'not_yet_relevant') {
      continue;
    }
    if (!isHouseholdRelevant(cluster.event)) continue;
    if (cluster.readiness === 'ready' && cluster.linkedCaptures.length === 0) continue;

    const event = cluster.event;
    if (!planEvents.some((e) => e.id === event.id)) continue;

    const hours = cluster.window.hoursUntilStart;
    if (hours > 14 || hours < -0.5) continue;

    const activeCount = cluster.linkedCaptures.filter(
      (c) => c.status !== 'done' && c.status !== 'archived',
    ).length;

    let prepLine = focusPrepBody(cluster.readiness, activeCount, event);
    const hasBring = cluster.linkedCaptures.some((c) => c.relationshipType === 'bring_to_event');
    if (hasBring) prepLine = 'Equipment reminder connected.';

    const windowStart = new Date(now);
    const windowEnd = new Date(event.startTime);

    candidates.push(
      buildCandidate({
        id: `transition-${event.id}-${dayKey(now)}`,
        type: 'transition_awareness',
        event,
        captureIds: cluster.relatedCaptureIds,
        generatedAt: now,
        windowStart,
        windowEnd,
        confidence: activeCount > 0 ? 'high' : 'medium',
        interruptionReason: 'Readiness context inside an actionable window.',
        bundleKey: `transition-${dayKey(now)}`,
        primaryLine: eventPrimaryLine(event),
        secondaryLine: prepAwarenessContextLine(event) || null,
        additionalLines: prepLine ? [prepLine] : [],
        prepRelevance: Math.min(3, activeCount + (hasBring ? 1 : 0)),
        householdImpact: cluster.event.relevance?.householdImpact,
        timingSensitivity: hours < 4 ? 'high' : 'medium',
      }),
    );
  }

  return candidates;
}
