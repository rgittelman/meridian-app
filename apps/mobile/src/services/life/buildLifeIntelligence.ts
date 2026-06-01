import type { MeridianCalendarEvent } from '@/types/calendar';
import type { LifeObject } from '@/types/capture';
import type {
  LifeCommitment,
  LifeDiagnostics,
  LifeDomainId,
  LifeIntelligenceSnapshot,
} from '@/types/life';
import { enrichEventsWithCaptureRelationships } from '@/services/relationships/calendarCaptureIndex';
import { buildPrepIntelligence } from '@/services/prep';
import { LIFE_DOMAIN_ORDER } from './constants';
import { buildCommitmentsFromData } from './buildCommitments';
import { detectRecurringPatterns } from './detectRecurringPatterns';
import { mapAttentionByDomain } from './mapAttention';
import { aggregateDomainSnapshot } from './aggregateDomain';
import { logDomainOwnershipFixtureAudit } from './domainOwnershipAudit';
import { logCrossDomainEventDuplicates, logLifeDiagnostics } from './lifeDebug';
import { isKnownPersonName } from '@/services/people/knownPeople';

export function buildLifeIntelligence(
  events: MeridianCalendarEvent[],
  captures: LifeObject[],
): LifeIntelligenceSnapshot {
  const { events: linkedEvents, index } = enrichEventsWithCaptureRelationships(
    events,
    captures,
  );
  const prepSnapshot = buildPrepIntelligence(linkedEvents, index);

  const { commitments, assignments, eventPrimaryDomain } = buildCommitmentsFromData(
    linkedEvents,
    captures,
  );
  const recurringPatterns = detectRecurringPatterns(commitments);
  const attentionByDomain = mapAttentionByDomain(commitments, recurringPatterns);

  const domains = LIFE_DOMAIN_ORDER.map((id) =>
    aggregateDomainSnapshot(
      id,
      commitments,
      attentionByDomain[id],
      recurringPatterns,
      index,
      prepSnapshot,
      eventPrimaryDomain,
    ),
  ).filter((d) => d.hasActivity);

  const peopleMappings = buildPeopleMappings(commitments);

  const diagnostics: LifeDiagnostics | null = __DEV__
    ? {
        domainAssignments: assignments,
        attentionByDomain,
        peopleMappings,
        recurringDetections: recurringPatterns,
      }
    : null;

  if (diagnostics) {
    logDomainOwnershipFixtureAudit();
    logLifeDiagnostics(diagnostics);
    logCrossDomainEventDuplicates(commitments, eventPrimaryDomain);
  }

  return {
    generatedAt: new Date(),
    domains,
    attentionByDomain,
    recurringPatterns,
    diagnostics,
  };
}

function buildPeopleMappings(
  commitments: LifeCommitment[],
): LifeDiagnostics['peopleMappings'] {
  const map = new Map<string, { domainId: LifeDomainId; ids: string[] }>();

  for (const c of commitments) {
    if (!c.personAnchor || !isKnownPersonName(c.personAnchor)) continue;
    const key = c.personAnchor;
    const entry = map.get(key) ?? {
      domainId: c.domainId,
      ids: [],
    };
    entry.ids.push(c.id);
    map.set(key, entry);
  }

  return Array.from(map.entries()).map(([person, v]) => ({
    person,
    domainId: v.domainId,
    commitmentIds: v.ids,
  }));
}
