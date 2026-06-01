import type {
  LifeCommitment,
  LifeDomainSnapshot,
  LifePersonAnchor,
  RecurringPattern,
} from '@/types/life';
import type { LifeDomainId } from '@/types/life';
import type { AttentionSignal } from '@/types/life';
import { LIFE_DOMAIN_DEFINITIONS } from './constants';
import { FAMILY_PERSON_ANCHORS } from './constants';
import { previewLineForCommitment } from './buildCommitments';
import { logLifePreviewSummary } from './formatPreviewLine';
import { prepClustersForDomain } from './buildPrepClusters';
import { patternsForDomain } from './detectRecurringPatterns';
import { logPrepClusters } from './lifeDebug';
import type { CalendarCaptureIndex } from '@/services/relationships/calendarCaptureIndex';
import type { PrepIntelligenceSnapshot } from '@/types/prep';
import { isKnownPersonName } from '@/services/people/knownPeople';
import { safeLower } from '@/utils/safeString';

function sortByTime(a: LifeCommitment, b: LifeCommitment): number {
  const ta = a.startTime?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const tb = b.startTime?.getTime() ?? Number.MAX_SAFE_INTEGER;
  return ta - tb;
}

function buildPeopleAnchors(
  domainId: LifeDomainId,
  commitments: LifeCommitment[],
): LifePersonAnchor[] {
  if (domainId !== 'family') return [];

  const byPerson = new Map<string, LifeCommitment[]>();

  for (const name of FAMILY_PERSON_ANCHORS) {
    byPerson.set(name, []);
  }

  for (const c of commitments) {
    if (!c.personAnchor || !isKnownPersonName(c.personAnchor)) continue;
    if (safeLower(c.personAnchor) === 'ryan') continue;
    const list = byPerson.get(c.personAnchor) ?? [];
    list.push(c);
    byPerson.set(c.personAnchor, list);
  }

  const anchors: LifePersonAnchor[] = [];

  for (const name of FAMILY_PERSON_ANCHORS) {
    const list = (byPerson.get(name) ?? []).sort(sortByTime);
    if (list.length === 0) continue;

    const next = list.find(
      (c) => c.startTime && c.startTime.getTime() >= Date.now(),
    ) ?? list[0];

    anchors.push({
      name,
      previewLine: previewLineForCommitment(next),
      commitmentCount: list.length,
    });
  }

  return anchors;
}

const MAX_DOMAIN_PREVIEW_LINES = 2;

function overflowLabel(
  domainId: LifeDomainId,
  domainLabel: string,
  remaining: number,
): string {
  if (domainId === 'family') {
    return `+${remaining} more family item${remaining === 1 ? '' : 's'}`;
  }
  const noun = domainLabel.toLowerCase();
  return `+${remaining} more ${noun} item${remaining === 1 ? '' : 's'}`;
}

function buildPreviewLines(
  domainId: LifeDomainId,
  upcoming: LifeCommitment[],
  prepClusters: LifeDomainSnapshot['prepClusters'],
  domainLabel: string,
): { lines: string[]; overflowLine: string | null } {
  const candidates: string[] = [];

  for (const c of upcoming) {
    candidates.push(previewLineForCommitment(c));
  }

  if (prepClusters.length > 0) {
    const cluster = prepClusters[0];
    if (cluster.readinessLine) {
      candidates.push(cluster.readinessLine);
    } else if (cluster.captureCount > 0) {
      const noun = cluster.captureCount === 1 ? 'item' : 'items';
      candidates.push(`${cluster.captureCount} connected preparation ${noun}`);
    }
  }

  const lines = candidates.slice(0, MAX_DOMAIN_PREVIEW_LINES);
  const remaining = candidates.length - lines.length;
  const overflowLine =
    remaining > 0 ? overflowLabel(domainId as LifeDomainId, domainLabel, remaining) : null;

  logLifePreviewSummary(domainLabel, lines, overflowLine);

  return { lines, overflowLine };
}

export function aggregateDomainSnapshot(
  domainId: LifeDomainId,
  allCommitments: LifeCommitment[],
  attention: AttentionSignal,
  allPatterns: RecurringPattern[],
  captureIndex?: CalendarCaptureIndex,
  prepSnapshot?: PrepIntelligenceSnapshot,
  eventPrimaryDomain?: ReadonlyMap<string, LifeDomainId>,
): LifeDomainSnapshot {
  const def = LIFE_DOMAIN_DEFINITIONS.find((d) => d.id === domainId)!;
  const now = Date.now();

  const inDomain = allCommitments.filter((c) => c.domainId === domainId);
  const upcoming = inDomain
    .filter(
      (c) =>
        (c.kind === 'event' &&
          c.startTime &&
          c.startTime.getTime() >= now) ||
        (c.kind === 'capture' &&
          (!c.startTime || c.startTime.getTime() >= now)),
    )
    .sort(sortByTime);

  const emotionalRank = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  const activeCaptures = inDomain
    .filter((c) => c.kind === 'capture' || c.kind === 'prep')
    .sort(
      (a, b) =>
        (emotionalRank[b.emotionalWeight] ?? 0) -
        (emotionalRank[a.emotionalWeight] ?? 0),
    );

  const domainEventIds = inDomain
    .map((c) => c.linkedEventId)
    .filter((id): id is string => typeof id === 'string' && id.length > 0)
    .filter(
      (eventId) =>
        !eventPrimaryDomain || eventPrimaryDomain.get(eventId) === domainId,
    );

  const prepClusters =
    captureIndex && prepSnapshot
      ? prepClustersForDomain(domainEventIds, captureIndex, prepSnapshot)
      : [];

  if (__DEV__ && prepClusters.length > 0) {
    logPrepClusters(def.label, prepClusters);
  }

  const recurringPatterns = patternsForDomain(allPatterns, domainId);
  const peopleAnchors = buildPeopleAnchors(domainId, inDomain);
  const { lines: previewLineList, overflowLine: previewOverflowLine } = buildPreviewLines(
    domainId,
    upcoming.filter((c) => c.kind === 'event'),
    prepClusters,
    def.label,
  );

  const hasActivity =
    upcoming.length > 0 ||
    activeCaptures.length > 0 ||
    recurringPatterns.length > 0 ||
    prepClusters.length > 0;

  return {
    id: domainId,
    label: def.label,
    attention,
    previewLines: hasActivity
      ? previewLineList.length > 0
        ? previewLineList
        : ['Quiet for now — still part of your life.']
      : ['Quiet for now — still part of your life.'],
    previewOverflowLine: hasActivity ? previewOverflowLine : null,
    peopleAnchors,
    upcomingCommitments: upcoming.slice(0, 12),
    activeCaptures: activeCaptures.slice(0, 10),
    prepClusters,
    recurringPatterns,
    hasActivity,
  };
}
