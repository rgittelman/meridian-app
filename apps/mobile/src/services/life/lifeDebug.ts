import type { LifeCommitment, LifeDiagnostics, LifeDomainId } from '@/types/life';
import type { PrepClusterSummary } from '@/types/life';

/** Development-only Life Intelligence diagnostics — never shown in UI. */
export function logLifeDiagnostics(diagnostics: LifeDiagnostics): void {
  if (!__DEV__) return;

  console.log('[Life Intelligence] domain assignments', diagnostics.domainAssignments);
  console.log('[Life Intelligence] attention mapping', diagnostics.attentionByDomain);
  console.log('[Life Intelligence] people mappings', diagnostics.peopleMappings);
  console.log('[Life Intelligence] recurring patterns', diagnostics.recurringDetections);
}

/** Warn when the same calendar event surfaces in multiple Life domains. */
export function logCrossDomainEventDuplicates(
  commitments: LifeCommitment[],
  eventPrimaryDomain: ReadonlyMap<string, LifeDomainId>,
): void {
  if (!__DEV__) return;

  const byEvent = new Map<string, Set<LifeDomainId>>();

  for (const c of commitments) {
    if (!c.linkedEventId || c.kind !== 'event') continue;
    const domains = byEvent.get(c.linkedEventId) ?? new Set();
    domains.add(c.domainId);
    byEvent.set(c.linkedEventId, domains);
  }

  for (const [eventId, domains] of byEvent) {
    if (domains.size <= 1) continue;
    console.warn('[Life Intelligence] duplicate event domain ownership', {
      eventId,
      domains: [...domains],
      canonical: eventPrimaryDomain.get(eventId),
    });
  }
}

export function logPrepClusters(domainLabel: string, clusters: PrepClusterSummary[]): void {
  if (!__DEV__ || clusters.length === 0) return;

  console.log(`[Life Intelligence] prep clusters · ${domainLabel}`, clusters.length);
  for (const c of clusters) {
    console.log('[Life Intelligence] prep cluster', {
      label: c.label,
      captureCount: c.captureCount,
      linkedEventTitle: c.linkedEventTitle,
    });
  }
}
