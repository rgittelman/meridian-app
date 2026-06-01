import type { LifeIntelligenceSnapshot, LifeDomainId } from '@/types/life';

/**
 * Subtle Plan subline when one domain clearly carries the week — never explicit metrics.
 */
export function derivePlanWeekWhisper(
  snapshot: LifeIntelligenceSnapshot | null,
): string | null {
  if (!snapshot) return null;

  const entries = Object.entries(snapshot.attentionByDomain) as Array<
    [LifeDomainId, { pressure: number }]
  >;
  const sorted = [...entries].sort((a, b) => b[1].pressure - a[1].pressure);
  const [topId, top] = sorted[0] ?? [];
  const second = sorted[1]?.[1]?.pressure ?? 0;

  if (!topId || top.pressure < 0.45) return null;
  if (top.pressure - second < 0.12) return null;

  switch (topId) {
    case 'family':
      return 'A full stretch at home and with the kids.';
    case 'work':
      return 'Work is carrying much of the rhythm this week.';
    case 'community':
      return 'Community threads are woven through the week.';
    case 'health':
      return 'Health and care are on the calendar this week.';
    case 'personal':
      return 'Personal threads have some room to breathe.';
    default:
      return null;
  }
}
