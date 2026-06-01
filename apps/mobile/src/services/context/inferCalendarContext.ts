import type { Confidence } from '@/types/capture';
import type { ItemCategory } from '@/services/priority/types';
import type { SourceCalendarMeta } from '@/types/calendar';
import { isKnownPersonName } from '@/services/people/knownPeople';
import { safeLower, safeTrim } from '@/utils/safeString';

export type CalendarNameSignals = {
  categoryBoost: ItemCategory | null;
  categoryConfidence: Confidence;
  personBoost: string | null;
  personConfidence: Confidence;
  communityBoost: boolean;
  workBoost: boolean;
  familyBoost: boolean;
  schoolBoost: boolean;
  sportsBoost: boolean;
};

const FAMILY_CALENDAR_NAMES = [
  'family', 'kids', 'children', 'home', 'household',
];
const WORK_CALENDAR_NAMES = ['work', 'office', 'professional', 'meridian'];
const COMMUNITY_CALENDAR_NAMES = ['bfsc', 'board', 'community', 'nonprofit', 'volunteer'];
const SCHOOL_CALENDAR_NAMES = ['school', 'classroom', 'pta'];
const SPORTS_HINTS = ['hockey', 'soccer', 'swim', 'sports', 'athletics', 'lacrosse'];

const KNOWN_PEOPLE = new Set([
  'ryan', 'crystal', 'grace', 'reagan', 'quinn', 'hudson',
]);

function normalizeCalendarName(name: string | null | undefined): string {
  return safeLower(name);
}

/**
 * Uses source calendar name as an inference signal — combined with title in inferFromEvent.
 */
export function inferSignalsFromCalendarName(
  calendar: Pick<SourceCalendarMeta, 'sourceCalendarName' | 'sourceCalendarPrimary'>,
): CalendarNameSignals {
  const name = normalizeCalendarName(calendar?.sourceCalendarName);
  if (!name) {
    return {
      categoryBoost: null,
      categoryConfidence: 'low',
      personBoost: null,
      personConfidence: 'low',
      communityBoost: false,
      workBoost: false,
      familyBoost: false,
      schoolBoost: false,
      sportsBoost: false,
    };
  }
  const tokens = name.split(/[\s·\-_|]+/).filter(Boolean);

  let categoryBoost: ItemCategory | null = null;
  let categoryConfidence: Confidence = 'low';
  let personBoost: string | null = null;
  let personConfidence: Confidence = 'low';
  let communityBoost = false;
  let workBoost = false;
  let familyBoost = false;
  let schoolBoost = false;
  let sportsBoost = false;

  if (WORK_CALENDAR_NAMES.some((w) => name.includes(w))) {
    categoryBoost = 'work';
    categoryConfidence = 'high';
    workBoost = true;
  }

  if (FAMILY_CALENDAR_NAMES.some((w) => name.includes(w))) {
    categoryBoost = 'family';
    categoryConfidence = 'high';
    familyBoost = true;
  }

  if (COMMUNITY_CALENDAR_NAMES.some((w) => name.includes(w))) {
    communityBoost = true;
    if (!categoryBoost) {
      categoryBoost = 'personal';
      categoryConfidence = 'medium';
    }
  }

  if (SCHOOL_CALENDAR_NAMES.some((w) => name.includes(w))) {
    schoolBoost = true;
    familyBoost = true;
    if (!categoryBoost) {
      categoryBoost = 'family';
      categoryConfidence = 'medium';
    }
  }

  if (SPORTS_HINTS.some((w) => name.includes(w))) {
    sportsBoost = true;
    familyBoost = true;
    if (!categoryBoost) {
      categoryBoost = 'family';
      categoryConfidence = 'medium';
    }
  }

  for (const token of tokens) {
    if (KNOWN_PEOPLE.has(token) && isKnownPersonName(token)) {
      const proper = token.charAt(0).toUpperCase() + token.slice(1);
      personBoost = proper;
      personConfidence = 'high';
      if (token === 'crystal') {
        familyBoost = true;
      }
      if (!categoryBoost) {
        categoryBoost = 'family';
        categoryConfidence = 'high';
      }
      break;
    }
  }

  if (!personBoost && name.includes('crystal')) {
    personBoost = 'Crystal';
    personConfidence = 'high';
    familyBoost = true;
    if (!categoryBoost) {
      categoryBoost = 'family';
      categoryConfidence = 'high';
    }
  }

  // Work-named calendars — category signal only, no default person owner
  if (!workBoost && name.includes('ryan') && name.includes('work')) {
    workBoost = true;
    categoryBoost = categoryBoost ?? 'work';
    categoryConfidence = 'high';
  }

  return {
    categoryBoost,
    categoryConfidence,
    personBoost,
    personConfidence,
    communityBoost,
    workBoost,
    familyBoost,
    schoolBoost,
    sportsBoost,
  };
}
