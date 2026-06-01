import { formatChildSportsDisplayTitle } from '@/services/relevance/childSportsDisplay';
import { inferChildFromSportsTitle } from '@/services/relevance/childSportsContext';
import {
  detectSportsActivityType,
  isGenericLeagueScheduleTitle,
  isTeamSnapOrSportsCalendar,
} from '@/services/relevance/isSportsSource';
import { matchingChildrenInText, memberByName } from '@/services/relevance/householdContext';
import { safeTrim } from '@/utils/safeString';

export type EventInferenceContext = {
  /** Title used for domain, owner, and affected inference */
  inferenceTitle: string;
  sportsChildName: string | null;
  sportsChildPersonId: string | null;
  isYouthSports: boolean;
};

/**
 * Aligns attribution inference with humanized household titles (e.g. Hudson · Hockey Game).
 */
export function buildEventInferenceContext(input: {
  title: string;
  description?: string;
  location?: string;
  sourceCalendarName: string;
  sourceCalendarDisplayLabel: string;
}): EventInferenceContext {
  const rawTitle = safeTrim(input.title, 'Untitled');
  const sportsChild = inferChildFromSportsTitle(rawTitle, input.location);
  const teamSnap = isTeamSnapOrSportsCalendar(
    input.sourceCalendarName,
    input.sourceCalendarDisplayLabel,
  );
  const activity = detectSportsActivityType(
    rawTitle,
    input.location,
    input.sourceCalendarName,
  );
  const isYouthSports =
    Boolean(sportsChild) ||
    (teamSnap && (activity !== null || isGenericLeagueScheduleTitle(rawTitle)));

  let inferenceTitle = rawTitle;

  if (sportsChild && (isGenericLeagueScheduleTitle(rawTitle) || teamSnap)) {
    inferenceTitle = formatChildSportsDisplayTitle(
      sportsChild.name,
      activity ?? 'game',
    );
  } else {
    const dot = rawTitle.match(/^([A-Za-z]+)\s*[·•]\s*/);
    if (dot) {
      const member = memberByName(dot[1]);
      if (member?.role === 'child') {
        inferenceTitle = rawTitle.replace(/•/g, '·');
      }
    }
  }

  const namedChildren = matchingChildrenInText(inferenceTitle);
  if (namedChildren.length === 1 && inferenceTitle === rawTitle && isYouthSports) {
    inferenceTitle = formatChildSportsDisplayTitle(
      namedChildren[0].name,
      activity ?? 'game',
    );
  }

  return {
    inferenceTitle,
    sportsChildName: sportsChild?.name ?? namedChildren[0]?.name ?? null,
    sportsChildPersonId: sportsChild?.personId ?? namedChildren[0]?.personId ?? null,
    isYouthSports,
  };
}
