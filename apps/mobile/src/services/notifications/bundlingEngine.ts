import type {
  NotificationBundle,
  NotificationCandidateType,
  NotificationSuppressionReason,
  ProcessedNotificationCandidate,
  ScoredNotificationCandidate,
} from '@/types/notification';
import { compareByInterruptionScore } from './interruptionScore';
import { dayKey } from './candidateHelpers';

function bundleTitle(type: NotificationCandidateType): string {
  switch (type) {
    case 'morning_brief':
      return "Today's shape";
    case 'evening_wind_down':
      return 'Before tomorrow';
    case 'transition_awareness':
      return "Today's awareness";
    case 'critical_commitment_protection':
      return 'Schedule overlap';
    default:
      return 'Awareness';
  }
}

function collectLines(c: ScoredNotificationCandidate): string[] {
  const lines = [c.primaryLine];
  if (c.secondaryLine) lines.push(c.secondaryLine);
  lines.push(...c.additionalLines);
  return [...new Set(lines.filter(Boolean))];
}

/**
 * Collapse related eligible candidates into one earned interruption.
 */
export function bundleNotificationCandidates(
  eligible: ScoredNotificationCandidate[],
  suppressed: ScoredNotificationCandidate[],
): {
  bundles: NotificationBundle[];
  processed: ProcessedNotificationCandidate[];
} {
  const processed: ProcessedNotificationCandidate[] = suppressed.map((c) => ({
    ...c,
    decision: 'suppress' as const,
    bundledIntoId: null,
  }));

  const transitionGroups = new Map<string, ScoredNotificationCandidate[]>();
  const standalone: ScoredNotificationCandidate[] = [];

  for (const c of eligible) {
    if (c.type === 'transition_awareness') {
      const key = dayKey(c.generatedAt);
      const list = transitionGroups.get(key) ?? [];
      list.push(c);
      transitionGroups.set(key, list);
    } else {
      standalone.push(c);
    }
  }

  const bundles: NotificationBundle[] = [];

  for (const c of standalone) {
    bundles.push({
      id: `bundle-${c.id}`,
      bundleKey: c.bundleKey,
      type: c.type,
      candidateIds: [c.id],
      title: bundleTitle(c.type),
      lines: collectLines(c),
      decision: 'send',
      suppressionReason: null,
      interruptionReason: c.interruptionReason,
      targetWindowStart: c.targetWindowStart,
      targetWindowEnd: c.targetWindowEnd,
      householdImpact: c.householdImpact,
      interruptionScore: c.interruptionScore,
    });
    processed.push({
      ...c,
      decision: 'send',
      bundledIntoId: null,
    });
  }

  for (const [, group] of transitionGroups) {
    const sorted = [...group].sort(compareByInterruptionScore);
    const lead = sorted[0];
    const lines: string[] = [];
    for (const item of sorted) {
      lines.push(...collectLines(item));
    }
    const bundleId = `bundle-transition-${dayKey(lead.generatedAt)}`;

    bundles.push({
      id: bundleId,
      bundleKey: `transition-${dayKey(lead.generatedAt)}`,
      type: 'transition_awareness',
      candidateIds: sorted.map((x) => x.id),
      title: bundleTitle('transition_awareness'),
      lines: [...new Set(lines)],
      decision: 'send',
      suppressionReason: null,
      interruptionReason: 'Readiness for upcoming commitments.',
      targetWindowStart: lead.targetWindowStart,
      targetWindowEnd: sorted.reduce(
        (latest, x) => (x.targetWindowEnd > latest ? x.targetWindowEnd : latest),
        lead.targetWindowEnd,
      ),
      householdImpact: lead.householdImpact,
      interruptionScore: lead.interruptionScore,
    });

    for (const c of sorted) {
      const isLead = c.id === lead.id;
      processed.push({
        ...c,
        decision: 'send',
        bundledIntoId: isLead ? null : bundleId,
        suppressionReason: isLead
          ? null
          : ('bundled_into_other_notification' as NotificationSuppressionReason),
      });
    }
  }

  return { bundles, processed };
}
