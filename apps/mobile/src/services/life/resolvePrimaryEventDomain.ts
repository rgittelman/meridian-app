import type { MeridianCalendarEvent } from '@/types/calendar';
import type { LifeDomainId } from '@/types/life';
import { inferEventDomain } from '@/services/attribution/inferDomain';
import { isTeamSnapOrSportsCalendar } from '@/services/relevance/isSportsSource';
import { matchingChildrenInText } from '@/services/relevance/householdContext';
import { matchKnownPeopleInText } from '@/services/people/knownPeople';
import { householdChildNamesInList } from './householdDomain';
import { safeLower, safeTrim } from '@/utils/safeString';

const CHILD_PERSON_KEYS = new Set(['grace', 'hudson', 'quinn', 'reagan']);

const YOUTH_ACTIVITY_PATTERN =
  /\b(?:hockey|soccer|practice|game|pickup|pick\s*up|drop\s*off|volleyball|cheer|tournament|recital)\b/i;

function eventTextBlob(event: MeridianCalendarEvent): string {
  return safeTrim(
    [
      event.displayTitle,
      event.title,
      event.description,
      event.location,
    ]
      .filter(Boolean)
      .join(' '),
  );
}

function peopleOnEvent(event: MeridianCalendarEvent): string[] {
  return [
    event.displayPersonLabel,
    event.inferredOwnerLabel,
    ...event.inferredPeople.map((p) => p.name),
    ...(event.attribution?.affectedPeople?.map((a) => a.displayName) ?? []),
  ].filter(Boolean) as string[];
}

/**
 * Child/youth/household-child signals only — adult parents (Ryan, Crystal) do NOT trigger Family.
 */
export function hasChildFamilyCommitmentSignal(event: MeridianCalendarEvent): boolean {
  if (isTeamSnapOrSportsCalendar(event.sourceCalendarName, event.displaySourceLabel)) {
    return true;
  }

  const text = eventTextBlob(event);

  if (matchingChildrenInText(text).length > 0) {
    return true;
  }

  const childOnEvent = householdChildNamesInList(peopleOnEvent(event));
  if (childOnEvent.length > 0) {
    return true;
  }

  const kidsInText = matchKnownPeopleInText(text).filter((p) =>
    CHILD_PERSON_KEYS.has(safeLower(p.name)),
  );
  if (kidsInText.length > 0) {
    return true;
  }

  const sourceBlob = safeLower(
    [
      event.sourceCalendarName,
      event.displaySourceLabel,
      event.planAttributionLine,
    ]
      .filter(Boolean)
      .join(' '),
  );

  if (sourceBlob.includes('family') && YOUTH_ACTIVITY_PATTERN.test(text)) {
    const hasChild =
      matchingChildrenInText(text).length > 0 ||
      householdChildNamesInList(peopleOnEvent(event)).length > 0 ||
      kidsInText.length > 0;
    if (hasChild) return true;
  }

  return false;
}

/**
 * @deprecated Use hasChildFamilyCommitmentSignal — adults no longer trigger Family.
 */
export function shouldPreferFamilyEventOwnership(event: MeridianCalendarEvent): boolean {
  return hasChildFamilyCommitmentSignal(event);
}

function inferDomainForEvent(event: MeridianCalendarEvent) {
  return inferEventDomain({
    title: event.displayTitle ?? event.title,
    description: event.description,
    location: event.location,
    sourceCalendarName: event.sourceCalendarName,
    sourceCalendarDisplayLabel: event.displaySourceLabel,
    inferredCategory: event.inferredCategory,
  });
}

/**
 * Single canonical domain per calendar event.
 * Priority: explicit community/work/health → child family commitment → attribution → inference fallback.
 */
export function resolvePrimaryEventDomain(event: MeridianCalendarEvent): LifeDomainId {
  const inferred = inferDomainForEvent(event);

  if (inferred.confidence === 'high' && inferred.domain !== 'family') {
    return inferred.domain;
  }

  if (hasChildFamilyCommitmentSignal(event)) {
    return 'family';
  }

  if (inferred.domain === 'family' && inferred.confidence !== 'low') {
    return 'family';
  }

  if (inferred.confidence === 'medium' && inferred.domain !== 'personal') {
    return inferred.domain;
  }

  if (event.attribution?.inferredDomain) {
    const attr = event.attribution.inferredDomain;
    if (attr === 'family' && !hasChildFamilyCommitmentSignal(event)) {
      return inferred.domain;
    }
    if (attr !== 'family' || hasChildFamilyCommitmentSignal(event)) {
      return attr;
    }
  }

  if (event.inferredLifeDomain) {
    if (
      event.inferredLifeDomain === 'family' &&
      !hasChildFamilyCommitmentSignal(event)
    ) {
      return inferred.domain;
    }
    return event.inferredLifeDomain;
  }

  return inferred.domain;
}

export function buildEventPrimaryDomainMap(
  events: MeridianCalendarEvent[],
): Map<string, LifeDomainId> {
  const map = new Map<string, LifeDomainId>();
  for (const event of events) {
    map.set(event.id, resolvePrimaryEventDomain(event));
  }
  return map;
}
