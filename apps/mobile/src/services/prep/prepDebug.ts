import type { PrepAwarenessItem, PrepCluster } from '@/types/prep';

export function logPrepIntelligenceDiagnostics(
  clusters: PrepCluster[],
  surfaced: PrepAwarenessItem[],
  now: number,
): void {
  if (!__DEV__) return;

  const entering = clusters.filter((c) => c.window.isActive).map((c) => c.eventTitle);
  const suppressed = clusters
    .filter((c) => !c.shouldSurface && c.suppressionReason)
    .map((c) => ({
      eventId: c.eventId,
      title: c.eventTitle,
      reason: c.suppressionReason!,
    }));

  console.log('[Prep Intelligence] ─── summary ───');
  console.log('[Prep Intelligence] generated clusters:', clusters.length);
  console.log('[Prep Intelligence] entering prep window:', entering.length);
  console.log('[Prep Intelligence] surfaced for Focus:', surfaced.length);
  console.log('[Prep Intelligence] suppressed:', suppressed.length);

  for (const c of clusters) {
    console.log('[Prep Intelligence] cluster', {
      title: c.eventTitle,
      readiness: c.readiness,
      windowActive: c.window.isActive,
      profile: c.window.profile,
      captures: c.linkedCaptures.length,
      priority: Math.round(c.priorityScore),
      surfaced: c.shouldSurface,
      suppression: c.suppressionReason,
      relatedLifeObjectId: c.event.relatedLifeObjectId,
    });
  }

  for (const s of suppressed.slice(0, 8)) {
    console.log('[Prep Intelligence] suppressed', s);
  }

  for (const item of surfaced) {
    console.log('[Prep Intelligence] focus prep', {
      primaryLabel: item.primaryLabel,
      contextLine: item.contextLine,
      body: item.body,
      readiness: item.readiness,
    });
  }

  void now;
}
