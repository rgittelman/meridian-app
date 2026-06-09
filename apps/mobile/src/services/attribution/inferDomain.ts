import type { CalendarNameSignals } from '@/services/context/inferCalendarContext';
import type { ItemCategory } from '@/services/priority/types';
import type { LifeDomainId } from '@/types/life';
import type { Confidence } from '@/types/capture';
import {
  textSignalsCommunity,
  textSignalsHealth,
  textSignalsPersonalMedical,
} from '@/services/life/domainSignals';
import { isSchoolCalendarSource } from '@/services/relevance/isSchoolSource';
import {
  evaluateSchoolHouseholdConnection,
} from '@/services/relevance/schoolHouseholdConnection';
import { matchingChildrenInText } from '@/services/relevance/householdContext';
import { inferChildFromSportsTitle } from '@/services/relevance/childSportsContext';
import {
  detectSportsActivityType,
  isGenericLeagueScheduleTitle,
  isTeamSnapOrSportsCalendar,
} from '@/services/relevance/isSportsSource';
import { matchKnownPeopleInText } from '@/services/people/knownPeople';
import { safeLower, safeTrim } from '@/utils/safeString';

const KIDS = new Set(['grace', 'hudson', 'quinn', 'reagan']);
const PERSONAL_TRIP = [
  'girls trip',
  "girl's trip",
  'girls weekend',
  'getaway',
  'bachelorette',
  'trip with',
];
const YOUTH_COMMITMENT = [
  'soccer',
  'hockey',
  'swim',
  'practice',
  'game',
  'cheer',
  'pickup',
  'pick up',
  'drop off',
  'performance',
  'concert',
  'recital',
  'tournament',
  'play',
  'musical',
];
const WORK_SIGNALS = [
  'budget',
  'sales',
  'meeting',
  'review',
  'standup',
  'sync',
  'leadership',
  'qbr',
  'touch base',
];

export type DomainInference = {
  domain: LifeDomainId;
  confidence: Confidence;
  reason: string;
};

/**
 * Domain is independent of calendar source and owner.
 * Child activities, sports, school participation, and youth commitments default to Family.
 */
export function inferEventDomain(input: {
  title: string;
  description?: string;
  location?: string;
  sourceCalendarName: string;
  sourceCalendarDisplayLabel: string;
  calendarSignals?: CalendarNameSignals;
  inferredCategory: ItemCategory | null;
}): DomainInference {
  const text = [input.title, safeTrim(input.description), safeTrim(input.location)]
    .filter(Boolean)
    .join(' ');
  const lower = safeLower(text);
  const sourceLower = safeLower(input.sourceCalendarDisplayLabel);
  const schoolSource = isSchoolCalendarSource(
    input.sourceCalendarName,
    input.sourceCalendarDisplayLabel,
  );

  if (textSignalsPersonalMedical(text) || textSignalsHealth(text)) {
    return { domain: 'health', confidence: 'high', reason: 'health_or_treatment_signal' };
  }

  if (input.inferredCategory === 'health') {
    return { domain: 'health', confidence: 'high', reason: 'health_category' };
  }

  if (textSignalsCommunity(text) || sourceLower.includes('bfsc')) {
    return { domain: 'community', confidence: 'high', reason: 'community_signal' };
  }

  if (
    input.inferredCategory === 'work' ||
    WORK_SIGNALS.some((s) => lower.includes(s)) ||
    sourceLower.includes('work') ||
    input.calendarSignals?.workBoost
  ) {
    return { domain: 'work', confidence: 'high', reason: 'work_signal' };
  }

  // Hoist family-signal computation so the financial gate can consult it.
  // Financial category is a signal, not an override — it must not preempt
  // strong family/youth/sports evidence in the event text.
  const namedChildren = matchingChildrenInText(text);
  const sportsChild = inferChildFromSportsTitle(input.title, input.location);
  const teamSnap = isTeamSnapOrSportsCalendar(
    input.sourceCalendarName,
    input.sourceCalendarDisplayLabel,
  );
  const activity = detectSportsActivityType(
    input.title,
    input.location,
    input.sourceCalendarName,
  );
  const youthActivity =
    YOUTH_COMMITMENT.some((s) => lower.includes(s)) ||
    Boolean(activity) ||
    isGenericLeagueScheduleTitle(input.title);
  const isYouthSports =
    Boolean(sportsChild) ||
    (teamSnap && (activity !== null || isGenericLeagueScheduleTitle(input.title)));

  if (
    input.inferredCategory === 'financial' ||
    /\b(?:bill|payment|invoice|mortgage|insurance premium)\b/.test(lower)
  ) {
    // Only return personal when there are no stronger family/youth signals.
    // e.g. "BILL DUE" calendar with title "Grace volleyball tournament Saturday"
    // should resolve to family, not personal — the calendar category is noise.
    const hasStrongFamilySignal = namedChildren.length > 0 || youthActivity || isYouthSports;
    if (!hasStrongFamilySignal) {
      return { domain: 'personal', confidence: 'medium', reason: 'financial_personal' };
    }
    // Fall through — family detection below will fire on the hoisted signals.
  }

  if (isYouthSports || (sportsChild && youthActivity)) {
    return { domain: 'family', confidence: 'high', reason: 'child_youth_sports_commitment' };
  }

  if (youthActivity && (namedChildren.length > 0 || sportsChild || teamSnap)) {
    return { domain: 'family', confidence: 'high', reason: 'youth_commitment_family' };
  }

  const kidsInText = matchKnownPeopleInText(text).filter((p) =>
    KIDS.has(safeLower(p.name)),
  );

  if (namedChildren.length > 0 && (youthActivity || schoolSource)) {
    return { domain: 'family', confidence: 'high', reason: 'child_named_family_activity' };
  }

  if (youthActivity && kidsInText.length > 0) {
    return { domain: 'family', confidence: 'high', reason: 'child_or_family_activity' };
  }

  if (
    PERSONAL_TRIP.some((s) => lower.includes(s)) ||
    (lower.includes('trip') &&
      !kidsInText.length &&
      (lower.includes('crystal') || lower.includes('stephanie')))
  ) {
    return { domain: 'personal', confidence: 'high', reason: 'personal_trip_signal' };
  }

  if (
    lower.includes('vacation') ||
    lower.includes('disney') ||
    lower.includes('resort') ||
    lower.includes('hotel stay')
  ) {
    if (kidsInText.length > 0 || namedChildren.length > 0) {
      return { domain: 'family', confidence: 'medium', reason: 'family_travel_with_kids' };
    }
    return { domain: 'personal', confidence: 'medium', reason: 'travel_without_child_owner' };
  }

  if (input.inferredCategory === 'family' && (kidsInText.length > 0 || namedChildren.length > 0)) {
    return { domain: 'family', confidence: 'medium', reason: 'family_category_with_child' };
  }

  if (schoolSource || sourceLower.includes('school') || sourceLower.includes('rcs')) {
    const connection = evaluateSchoolHouseholdConnection(
      input.title,
      input.description,
    );
    if (connection.connected) {
      return { domain: 'family', confidence: 'high', reason: 'school_household_connection' };
    }
    return { domain: 'personal', confidence: 'low', reason: 'school_feed_no_connection' };
  }

  if (sourceLower.includes('family')) {
    if (
      youthActivity ||
      kidsInText.length > 0 ||
      namedChildren.length > 0 ||
      lower.includes('pickup') ||
      lower.includes('pick up')
    ) {
      return { domain: 'family', confidence: 'medium', reason: 'family_calendar_child_signal' };
    }
    return { domain: 'personal', confidence: 'medium', reason: 'family_calendar_non_commitment' };
  }

  if (input.inferredCategory === 'personal') {
    return { domain: 'personal', confidence: 'medium', reason: 'personal_category' };
  }

  return { domain: 'personal', confidence: 'low', reason: 'default_personal' };
}
