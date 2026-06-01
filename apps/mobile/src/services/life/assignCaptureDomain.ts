import type { LifeObject } from '@/types/capture';
import type { LifeDomainId } from '@/types/life';
import { brandDomainBoosts } from '@/utils/parsing/brandExclusions';
import { isHouseholdChildPerson } from './householdDomain';
import { textSignalsCommunity, textSignalsHealth } from './domainSignals';
import { safeLower, safeTrim } from '@/utils/safeString';

export type CaptureDomainAssignment = {
  domainId: LifeDomainId;
  reason: string;
};

/** Capture-only domain assignment — no calendar / React Native dependency chain. */
export function assignDomainFromCapture(
  obj: LifeObject,
  eventPrimaryDomain?: ReadonlyMap<string, LifeDomainId>,
): CaptureDomainAssignment {
  if (obj.linkedCalendarEventId && eventPrimaryDomain?.has(obj.linkedCalendarEventId)) {
    return {
      domainId: eventPrimaryDomain.get(obj.linkedCalendarEventId)!,
      reason: 'linked_event_primary_domain',
    };
  }
  const text = [obj.title, obj.raw, obj.linkedCalendarEventTitle ?? ''].join(' ');
  const cat = obj.parse.category?.value;

  if (cat === 'health' || textSignalsHealth(text)) {
    return { domainId: 'health', reason: 'health_capture' };
  }

  if (
    textSignalsCommunity(text) ||
    obj.relationshipType === 'community_related' ||
    safeLower(obj.linkedCalendarEventSourceCalendar ?? '').includes('bfsc')
  ) {
    return { domainId: 'community', reason: 'community_capture' };
  }

  const workBrand = brandDomainBoosts(text).find((b) => b.category === 'work');
  if (cat === 'work' || obj.relationshipType === 'work_related' || workBrand) {
    return {
      domainId: 'work',
      reason: workBrand ? 'work_retail_brand' : 'work_capture',
    };
  }

  const childPerson = obj.parse.people.find((p) => isHouseholdChildPerson(p.value));
  if (childPerson) {
    return { domainId: 'family', reason: `family_child_${childPerson.value}` };
  }

  if (cat === 'family' || obj.relationshipType === 'household_related') {
    return { domainId: 'family', reason: 'family_household_capture' };
  }

  if (cat === 'financial') {
    return { domainId: 'personal', reason: 'financial_capture' };
  }

  if (cat === 'personal') {
    return { domainId: 'personal', reason: 'personal_category' };
  }

  return { domainId: 'personal', reason: 'capture_default' };
}
