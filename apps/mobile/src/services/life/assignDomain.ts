import type { MeridianCalendarEvent } from '@/types/calendar';
import type { LifeDomainId } from '@/types/life';
import { hasChildFamilyCommitmentSignal, resolvePrimaryEventDomain } from './resolvePrimaryEventDomain';
import { safeTrim } from '@/utils/safeString';

export type DomainAssignment = {
  domainId: LifeDomainId;
  reason: string;
};

/** Life domain — one primary domain per event; child commitments → Family, not adult parents. */
export function assignDomainFromEvent(event: MeridianCalendarEvent): DomainAssignment {
  const domainId = resolvePrimaryEventDomain(event);

  if (hasChildFamilyCommitmentSignal(event) && domainId === 'family') {
    return { domainId, reason: 'family_child_commitment' };
  }

  if (event.attribution?.inferredDomain === domainId) {
    return {
      domainId,
      reason: event.attribution.diagnostics?.domainReason ?? 'attribution_domain',
    };
  }

  return { domainId, reason: 'resolved_primary_domain' };
}

export { assignDomainFromCapture } from './assignCaptureDomain';
