import type { Confidence } from '@/types/capture';
import type { MeridianCalendarEvent } from '@/types/calendar';
import { buildPlanAttributionLine } from '@/services/attribution/planDisplay';
import {
  buildChildSportsDisplayTitle,
  formatChildSportsDisplayTitle,
  isAlreadyChildSportsDisplayTitle,
  resolveChildForSportsDisplay,
  sportsActivityLabel,
} from './childSportsDisplay';
import { inferChildFromSportsTitle } from './childSportsContext';
import { matchingChildrenInText } from './householdContext';
import {
  detectSportsActivityType,
  isGenericLeagueScheduleTitle,
  isTeamSnapOrSportsCalendar,
} from './isSportsSource';
import { isKnownPersonName } from '@/services/people/knownPeople';
import { safeTrim } from '@/utils/safeString';

export type EventDisplayFields = {
  rawTitle: string;
  displayTitle: string;
  displaySubtitle: string;
  displayActivityType: string | null;
  displayPersonLabel: string | null;
  displayLabel: string;
  planAttributionLine: string;
  humanizationReason: string | null;
  humanizationConfidence: Confidence | null;
};

/**
 * Transforms raw calendar titles into household-readable display labels.
 * Raw title is preserved in rawTitle/title; displayTitle is humanized for UI surfaces.
 */
export function buildEventDisplayFields(event: MeridianCalendarEvent): EventDisplayFields {
  const rawTitle = safeTrim(event.rawTitle ?? event.title, 'Untitled');
  const displaySourceLabel = event.displaySourceLabel ?? event.sourceCalendarDisplayLabel;
  const location = event.location;
  const attr = event.attribution;

  const sportsChild = inferChildFromSportsTitle(rawTitle, location);
  const textChildren = matchingChildrenInText([rawTitle, location ?? ''].join(' '));
  const activity = detectSportsActivityType(
    rawTitle,
    location,
    event.sourceCalendarName,
  );

  let displayTitle = rawTitle;
  let displayPersonLabel: string | null = null;
  let displayActivityType = activity;
  let humanizationReason: string | null = null;
  let humanizationConfidence: Confidence | null = null;

  if (isAlreadyChildSportsDisplayTitle(rawTitle)) {
    displayTitle = rawTitle.replace(/•/g, '·');
    const childName = resolveChildForSportsDisplay(event, sportsChild);
    displayPersonLabel = childName;
    displayActivityType = activity ?? 'hockey';
    humanizationReason = 'already_humanized_child_sports';
    humanizationConfidence = 'high';
  } else {
    const childSportsDisplay = buildChildSportsDisplayTitle({
      ...event,
      rawTitle,
      title: rawTitle,
      displaySourceLabel,
    });

    if (childSportsDisplay) {
      displayTitle = childSportsDisplay.displayTitle;
      displayPersonLabel = childSportsDisplay.displayPersonLabel;
      displayActivityType = childSportsDisplay.displayActivityType;
      humanizationReason = childSportsDisplay.humanizationReason;
      humanizationConfidence = childSportsDisplay.humanizationConfidence;
    } else {
      const teamSnap = isTeamSnapOrSportsCalendar(
        event.sourceCalendarName,
        displaySourceLabel,
      );

      if (
        teamSnap &&
        (isGenericLeagueScheduleTitle(rawTitle) || sportsChild)
      ) {
        displayActivityType = displayActivityType ?? 'game';
        if (sportsChild) {
          displayPersonLabel = sportsChild.name;
          displayTitle = formatChildSportsDisplayTitle(
            sportsChild.name,
            displayActivityType,
          );
          humanizationReason = 'teamsnap_league_humanized';
          humanizationConfidence = sportsChild.confidence;
        } else {
          displayTitle = sportsActivityLabel(displayActivityType);
          humanizationReason = 'teamsnap_hockey_generic';
          humanizationConfidence = 'medium';
        }
      } else if (
        attr?.ownerType === 'person' &&
        attr.ownerConfidence === 'high' &&
        attr.ownerDisplayName &&
        isKnownPersonName(attr.ownerDisplayName)
      ) {
        displayPersonLabel = attr.ownerDisplayName;
        const act = activity ?? detectSportsActivityType(rawTitle, location);
        if (act && !safeTrim(rawTitle).toLowerCase().includes(act)) {
          displayTitle = formatChildSportsDisplayTitle(attr.ownerDisplayName, act);
          humanizationReason = 'owner_and_activity';
          humanizationConfidence = 'high';
        } else if (textChildren.length > 0 && sportsChild) {
          displayTitle = formatChildSportsDisplayTitle(sportsChild.name, act ?? 'game');
          displayPersonLabel = sportsChild.name;
          humanizationReason = 'child_sports_in_title';
          humanizationConfidence = 'high';
        }
      } else if (textChildren.length === 1) {
        const child = textChildren[0];
        const act = activity ?? detectSportsActivityType(rawTitle, location);
        if (act) {
          displayPersonLabel = child.name;
          displayTitle = formatChildSportsDisplayTitle(child.name, act);
          humanizationReason = 'named_child_activity';
          humanizationConfidence = 'high';
        }
      } else if (sportsChild && isGenericLeagueScheduleTitle(rawTitle)) {
        displayPersonLabel = sportsChild.name;
        displayActivityType = displayActivityType ?? 'hockey';
        displayTitle = formatChildSportsDisplayTitle(
          sportsChild.name,
          displayActivityType,
        );
        humanizationReason = 'league_title_child_match';
        humanizationConfidence = sportsChild.confidence;
      }
    }
  }

  const displaySubtitle = displaySourceLabel;
  const planAttributionLine =
    attr && displayPersonLabel && attr.ownerConfidence === 'high'
      ? buildPlanAttributionLine(attr)
      : displaySubtitle;

  return {
    rawTitle,
    displayTitle,
    displaySubtitle,
    displayActivityType,
    displayPersonLabel,
    displayLabel: displayTitle,
    planAttributionLine,
    humanizationReason,
    humanizationConfidence,
  };
}

export function applyEventDisplayToEvent(
  event: MeridianCalendarEvent,
): MeridianCalendarEvent {
  const display = buildEventDisplayFields(event);
  return {
    ...event,
    rawTitle: display.rawTitle,
    title: display.rawTitle,
    displayTitle: display.displayTitle,
    displaySubtitle: display.displaySubtitle,
    displayActivityType: display.displayActivityType,
    displayPersonLabel: display.displayPersonLabel,
    displayLabel: display.displayLabel,
    planAttributionLine: display.planAttributionLine,
  };
}
