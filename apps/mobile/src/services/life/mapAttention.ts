import type {
  AttentionLevel,
  AttentionSignal,
  LifeCommitment,
  LifeDomainId,
  RecurringPattern,
} from '@/types/life';

const DOMAIN_IDS: LifeDomainId[] = [
  'family',
  'work',
  'community',
  'health',
  'personal',
];

function levelFromPressure(pressure: number): AttentionLevel {
  if (pressure >= 0.55) return 'active';
  if (pressure >= 0.28) return 'present';
  return 'quiet';
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Maps where attention is going — internal weights only, never shown as scores.
 */
export function mapAttentionByDomain(
  commitments: LifeCommitment[],
  patterns: RecurringPattern[],
  horizonDays = 7,
): Record<LifeDomainId, AttentionSignal> {
  const now = Date.now();
  const horizonMs = horizonDays * 86_400_000;

  const result = {} as Record<LifeDomainId, AttentionSignal>;

  for (const domainId of DOMAIN_IDS) {
    const inDomain = commitments.filter((c) => c.domainId === domainId);
    const upcoming = inDomain.filter(
      (c) =>
        c.startTime &&
        c.startTime.getTime() >= now &&
        c.startTime.getTime() <= now + horizonMs,
    );
    const prep = inDomain.filter((c) => c.kind === 'prep');
    const domainPatterns = patterns.filter((p) => p.domainId === domainId);

    const eventDensity = clamp01(upcoming.filter((c) => c.kind === 'event').length / 6);
    const prepDensity = clamp01(prep.length / 4);
    const recurringWeight = clamp01(domainPatterns.length / 3);

    let peopleWeight = 0;
    let timingWeight = 0;
    for (const c of inDomain) {
      if (c.peopleImpact === 'HIGH' || c.peopleImpact === 'VERY_HIGH') {
        peopleWeight += 0.2;
      }
      if (c.timingSensitivity === 'high') timingWeight += 0.15;
      if (c.emotionalWeight === 'HIGH' || c.emotionalWeight === 'CRITICAL') {
        peopleWeight += 0.08;
      }
    }
    peopleWeight = clamp01(peopleWeight);
    timingWeight = clamp01(timingWeight);

    const pressure = clamp01(
      eventDensity * 0.35 +
        prepDensity * 0.3 +
        recurringWeight * 0.15 +
        peopleWeight * 0.12 +
        timingWeight * 0.08,
    );

    result[domainId] = {
      level: levelFromPressure(pressure),
      pressure,
      factors: {
        eventDensity,
        prepDensity,
        recurringWeight,
        peopleWeight,
        timingWeight,
      },
    };
  }

  return result;
}
