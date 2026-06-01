import type { Confidence } from '@/types/capture';
import type { EventAttribution } from '@/types/attribution';
import type { MeridianCalendarEvent } from '@/types/calendar';
import {
  inferChildFromSportsTitle,
  type InferredSportsChild,
} from './childSportsContext';
import { memberByName } from './householdContext';
import {
  detectSportsActivityType,
  isGenericLeagueScheduleTitle,
  isTeamSnapOrSportsCalendar,
} from './isSportsSource';
import { safeTrim } from '@/utils/safeString';

const CHILD_PERSON_IDS = new Set(['grace', 'hudson', 'quinn', 'reagan']);

/** Household-readable activity label (e.g. hockey → Hockey Game). */
export function sportsActivityLabel(activity: string | null | undefined): string {
  if (!activity) return 'Hockey Game';
  const map: Record<string, string> = {
    hockey: 'Hockey Game',
    soccer: 'Soccer',
    volleyball: 'Volleyball',
    football: 'Football',
    cheer: 'Cheer',
    swim: 'Swim',
    lacrosse: 'Lacrosse',
    game: 'Game',
  };
  return map[activity] ?? activity.charAt(0).toUpperCase() + activity.slice(1);
}

/** Preferred TeamSnap / youth sports display: Hudson · Hockey Game */
export function formatChildSportsDisplayTitle(
  personName: string,
  activity: string | null | undefined,
): string {
  return `${personName} · ${sportsActivityLabel(activity)}`;
}

export function isAlreadyChildSportsDisplayTitle(title: string): boolean {
  const match = safeTrim(title).match(/^([A-Za-z]+)\s*[·•]\s+(.+)$/);
  if (!match) return false;
  return memberByName(match[1])?.role === 'child';
}

export function resolveChildForSportsDisplay(
  event: Pick<
    MeridianCalendarEvent,
    'title' | 'rawTitle' | 'location' | 'attribution' | 'displayPersonLabel'
  >,
  sportsChild?: InferredSportsChild | null,
): string | null {
  const rawTitle = safeTrim(event.rawTitle ?? event.title, 'Untitled');
  const inferred =
    sportsChild ?? inferChildFromSportsTitle(rawTitle, event.location);
  if (inferred) return inferred.name;

  const attr = event.attribution;
  if (
    attr?.ownerType === 'person' &&
    attr.ownerPersonId &&
    CHILD_PERSON_IDS.has(attr.ownerPersonId) &&
    attr.ownerConfidence !== 'low' &&
    attr.ownerDisplayName
  ) {
    return attr.ownerDisplayName;
  }

  if (
    event.displayPersonLabel &&
    memberByName(event.displayPersonLabel)?.role === 'child'
  ) {
    return event.displayPersonLabel;
  }

  return null;
}

export function shouldHumanizeChildSportsTitle(input: {
  rawTitle: string;
  location?: string;
  sourceCalendarName: string;
  displaySourceLabel: string;
  sportsChild: InferredSportsChild | null;
  childName: string | null;
  activity: string | null;
  attribution?: EventAttribution;
}): boolean {
  if (!input.childName) return false;

  if (isAlreadyChildSportsDisplayTitle(input.rawTitle)) {
    return false;
  }

  const teamSnap = isTeamSnapOrSportsCalendar(
    input.sourceCalendarName,
    input.displaySourceLabel,
  );
  const leagueLike = isGenericLeagueScheduleTitle(input.rawTitle);
  const hockey =
    input.activity === 'hockey' ||
    /\bhockey\b/i.test(input.rawTitle) ||
    /\bhockey\b/i.test(input.location ?? '');

  return (
    Boolean(input.sportsChild) ||
    leagueLike ||
    (teamSnap && (hockey || leagueLike)) ||
    (input.attribution?.inferredDomain === 'family' &&
      (leagueLike || hockey || teamSnap || Boolean(input.sportsChild)))
  );
}

export function buildChildSportsDisplayTitle(
  event: Pick<
    MeridianCalendarEvent,
    | 'title'
    | 'rawTitle'
    | 'location'
    | 'sourceCalendarName'
    | 'displaySourceLabel'
    | 'sourceCalendarDisplayLabel'
    | 'attribution'
    | 'displayPersonLabel'
  >,
): {
  displayTitle: string;
  displayPersonLabel: string;
  displayActivityType: string | null;
  humanizationReason: string;
  humanizationConfidence: Confidence;
} | null {
  const rawTitle = safeTrim(event.rawTitle ?? event.title, 'Untitled');
  const displaySourceLabel =
    event.displaySourceLabel ?? event.sourceCalendarDisplayLabel ?? '';
  const sportsChild = inferChildFromSportsTitle(rawTitle, event.location);
  const childName = resolveChildForSportsDisplay(event, sportsChild);
  const activity =
    detectSportsActivityType(rawTitle, event.location, event.sourceCalendarName) ??
    'hockey';

  if (
    !shouldHumanizeChildSportsTitle({
      rawTitle,
      location: event.location,
      sourceCalendarName: event.sourceCalendarName,
      displaySourceLabel,
      sportsChild,
      childName,
      activity,
      attribution: event.attribution,
    })
  ) {
    return null;
  }

  if (!childName) return null;

  return {
    displayTitle: formatChildSportsDisplayTitle(childName, activity),
    displayPersonLabel: childName,
    displayActivityType: activity,
    humanizationReason: sportsChild
      ? 'child_sports_teamsnap_humanized'
      : 'child_sports_attribution_humanized',
    humanizationConfidence: sportsChild?.confidence === 'medium' ? 'medium' : 'high',
  };
}
