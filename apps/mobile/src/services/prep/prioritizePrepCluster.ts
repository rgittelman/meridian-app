import type { PrepCluster } from '@/types/prep';
import type { MeridianCalendarEvent } from '@/types/calendar';
import { isHouseholdRelevant } from '@/services/relevance';

const DOMAIN_WEIGHT: Record<string, number> = {
  family: 1.15,
  community: 1.05,
  work: 1,
  health: 1.02,
  personal: 0.85,
};

const PEOPLE_IMPACT: Record<string, number> = {
  NONE: 0,
  LOW: 0.1,
  MEDIUM: 0.2,
  HIGH: 0.35,
  VERY_HIGH: 0.45,
};

export function scorePrepCluster(
  event: MeridianCalendarEvent,
  cluster: Pick<
    PrepCluster,
    'linkedCaptures' | 'readiness' | 'window' | 'domainId'
  >,
): number {
  if (!isHouseholdRelevant(event)) return 0;

  let score = 50;

  const domainMul = DOMAIN_WEIGHT[cluster.domainId] ?? 1;
  score *= domainMul;

  score += PEOPLE_IMPACT[event.peopleImpact] ?? 0;

  if (event.timingSensitivity === 'high') score += 12;
  if (event.timingSensitivity === 'medium') score += 6;

  if (event.emotionalWeight === 'CRITICAL') score += 14;
  if (event.emotionalWeight === 'HIGH') score += 8;

  const hours = cluster.window.hoursUntilStart;
  if (hours >= 0 && hours <= 6) score += 18;
  else if (hours <= 24) score += 12;
  else if (hours <= 48) score += 6;

  const activeCaptures = cluster.linkedCaptures.filter(
    (c) => c.status !== 'done' && c.status !== 'archived',
  );
  score += Math.min(activeCaptures.length * 4, 12);

  if (cluster.readiness === 'needs_attention') score += 10;
  if (cluster.readiness === 'mostly_ready') score += 5;
  if (cluster.readiness === 'ready') score -= 8;
  if (cluster.readiness === 'no_prep_detected') score += 2;

  if (!cluster.window.isActive) score -= 25;

  if (event.relevance?.relevanceScore === 'high') score += 8;
  if (event.relevance?.relevanceScore === 'low') score -= 20;

  return Math.max(0, score);
}

export function sortPrepClustersByPriority(clusters: PrepCluster[]): PrepCluster[] {
  return [...clusters].sort((a, b) => b.priorityScore - a.priorityScore);
}
