import type { MeridianCalendarEvent } from '@/types/calendar';
import type { AttentionSignal, LifeDomainId } from '@/types/life';
import type { ActivityDay } from '@/components/shared/metrics/WeeklyActivityBar';

// Inline to avoid pulling in lucide-react-native via services/life/constants
const DOMAIN_ORDER: LifeDomainId[] = ['family', 'work', 'community', 'health', 'personal'];

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

/**
 * Derives 7 ActivityDay slots (Sun–Sat of the current week) from calendar events.
 *
 * Each bar's domain color is determined by whichever domain has the most events
 * that day. Ties break by LIFE_DOMAIN_ORDER. Days with no events render at min height.
 * Events outside the current Sun–Sat week are excluded.
 */
export function deriveWeeklyActivityDays(
  weekEvents: MeridianCalendarEvent[],
  attentionByDomain: Record<LifeDomainId, AttentionSignal>,
  today: Date,
): ActivityDay[] {
  const todayIndex = today.getDay(); // 0 = Sun

  // Build Sun–Sat slot boundaries for the current week
  const weekStart = new Date(today);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(today.getDate() - todayIndex);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  // Count events per weekday slot, tracking domain counts
  const dayCounts: Array<Record<LifeDomainId, number>> = Array.from({ length: 7 }, () => ({
    family: 0,
    work: 0,
    community: 0,
    health: 0,
    personal: 0,
  }));

  for (const event of weekEvents) {
    const start = new Date(event.startTime);
    if (start < weekStart || start >= weekEnd) continue;
    const slot = start.getDay(); // 0 = Sun
    dayCounts[slot][event.inferredLifeDomain] += 1;
  }

  // Resolve dominant domain per day (most events; tie → LIFE_DOMAIN_ORDER priority)
  return dayCounts.map((counts, i) => {
    const total = (Object.values(counts) as number[]).reduce((s, n) => s + n, 0);
    const dominant = dominantDomain(counts);
    // Use attention pressure to tint "active" days with higher importance
    const domainPressure = dominant ? attentionByDomain[dominant]?.pressure ?? 0 : 0;

    return {
      label: DAY_LABELS[i],
      count: total,
      domain: total > 0 ? dominant ?? undefined : undefined,
      isToday: i === todayIndex,
      // Expose pressure for potential future use — unused by WeeklyActivityBar but harmless
      _pressure: domainPressure,
    } satisfies ActivityDay & { _pressure: number };
  });
}

function dominantDomain(
  counts: Record<LifeDomainId, number>,
): LifeDomainId | null {
  let best: LifeDomainId | null = null;
  let bestCount = 0;

  // Iterate in LIFE_DOMAIN_ORDER so ties break predictably
  for (const domain of DOMAIN_ORDER) {
    const c = counts[domain];
    if (c > bestCount) {
      bestCount = c;
      best = domain;
    }
  }
  return best;
}

/**
 * Derives LifeBalanceChart segment counts from a domain snapshot array.
 * Count = upcoming commitments + active captures per domain.
 */
export function deriveBalanceSegments(
  domains: Array<{ id: LifeDomainId; upcomingCommitments: unknown[]; activeCaptures: unknown[] }>,
): Array<{ domain: LifeDomainId; count: number }> {
  return domains.map((d) => ({
    domain: d.id,
    count: d.upcomingCommitments.length + d.activeCaptures.length,
  }));
}

/**
 * Returns a calm, intelligent headline for the Life screen.
 *
 * When top domain labels are supplied, the headline names them by domain.
 * Never uses counts as scores — describes the character of the week.
 */
export function deriveLifeHeadline(
  activeDomainCount: number,
  hasActivity: boolean,
  topDomainLabels: string[] = [],
): string {
  if (!hasActivity) return 'Patterns become clearer over time.';

  const [first, second] = topDomainLabels;

  if (activeDomainCount === 1) {
    return first
      ? `${first} is carrying your week.`
      : 'One area is carrying the week.';
  }

  if (activeDomainCount === 2) {
    return first && second
      ? `${first} and ${second} are in motion.`
      : 'Two areas are in motion.';
  }

  // 3+: name the top two if available, otherwise calm generic
  return first && second
    ? `${first} and ${second} are leading the week.`
    : 'Your attention is across a few areas.';
}

/**
 * Returns the top N domain labels by combined commitment count.
 * Used to personalise the Life screen headline.
 */
export function deriveTopDomainLabels(
  domains: Array<{ label: string; upcomingCommitments: unknown[]; activeCaptures: unknown[] }>,
  n = 2,
): string[] {
  return [...domains]
    .sort(
      (a, b) =>
        (b.upcomingCommitments.length + b.activeCaptures.length) -
        (a.upcomingCommitments.length + a.activeCaptures.length),
    )
    .slice(0, n)
    .map((d) => d.label);
}
