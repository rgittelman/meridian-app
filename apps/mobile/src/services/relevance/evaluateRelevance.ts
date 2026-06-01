import type { Confidence } from '@/types/capture';
import type { MeridianCalendarEvent } from '@/types/calendar';
import type {
  EventRelevance,
  HouseholdImpactLevel,
  RelevanceLevel,
} from '@/types/relevance';
import { matchKnownPeopleInText } from '@/services/people/knownPeople';
import { isSchoolCalendarSource, isSubscriptionOrFeedSource } from './isSchoolSource';
import {
  extractGradeNumbers,
  householdMatchesGrades,
  matchingChildrenInText,
  memberByName,
} from './householdContext';
import {
  evaluateSchoolHouseholdConnection,
  isSchoolInformationalFeed,
} from './schoolHouseholdConnection';
import { inferChildFromSportsTitle } from './childSportsContext';
import {
  isGenericLeagueScheduleTitle,
  isTeamSnapOrSportsCalendar,
  detectSportsActivityType,
} from './isSportsSource';
import { logRelevanceDiagnostics } from './relevanceDebug';
import { safeLower, safeTrim } from '@/utils/safeString';

const FAMILY_ACTIVITY = [
  'soccer',
  'hockey',
  'swim',
  'practice',
  'game',
  'cheer',
  'pickup',
  'pick up',
  'drop off',
];

function toImpact(score: RelevanceLevel): HouseholdImpactLevel {
  switch (score) {
    case 'high':
      return 'high';
    case 'medium':
      return 'medium';
    case 'low':
      return 'none';
    default:
      return 'none';
  }
}

function buildResult(
  score: RelevanceLevel,
  reason: string,
  confidence: Confidence,
  matched: string[],
  sourceRole: EventRelevance['sourceRole'],
  extra?: EventRelevance['diagnostics'],
): EventRelevance {
  const isRelevant = score === 'high' || score === 'medium';
  return {
    relevanceScore: score,
    relevanceReason: reason,
    relevanceConfidence: confidence,
    householdImpact: toImpact(score),
    matchedHouseholdMembers: matched,
    sourceRole,
    isRelevant,
    preferences: {},
    diagnostics: extra,
  };
}

function collectMatchedNames(
  event: MeridianCalendarEvent,
  text: string,
): string[] {
  const matchedChildren = matchingChildrenInText(text);
  const matchedNames = matchedChildren.map((c) => c.name);
  const attr = event.attribution;

  if (attr?.ownerType === 'person' && attr.ownerDisplayName) {
    const owner = memberByName(attr.ownerDisplayName);
    if (owner && !matchedNames.includes(owner.name)) {
      matchedNames.push(owner.name);
    }
  }

  for (const p of event.inferredPeople) {
    if (p.confidence !== 'low' && !matchedNames.includes(p.name)) {
      matchedNames.push(p.name);
    }
  }

  for (const a of attr?.affectedPeople ?? []) {
    if (!matchedNames.includes(a.displayName)) {
      matchedNames.push(a.displayName);
    }
  }

  return matchedNames;
}

/**
 * Determines whether an event deserves household attention — runs after attribution.
 */
export function evaluateEventRelevance(event: MeridianCalendarEvent): EventRelevance {
  const title = safeTrim(event.title);
  const text = [title, safeTrim(event.description)].filter(Boolean).join(' ');
  const lower = safeLower(text);
  const displayLabel = event.displaySourceLabel ?? event.sourceCalendarDisplayLabel;
  const schoolSource = isSchoolCalendarSource(event.sourceCalendarName, displayLabel);
  const sourceRole: EventRelevance['sourceRole'] = schoolSource ? 'context' : 'commitment';

  if (isSubscriptionOrFeedSource(event.sourceCalendarName)) {
    const result = buildResult(
      'low',
      'subscription_or_feed_calendar',
      'high',
      [],
      'context',
      { suppressionReason: 'Subscription calendar' },
    );
    logRelevanceDiagnostics(event, result);
    return result;
  }

  if (event.signalClassification === 'subscription_noise') {
    const result = buildResult('low', 'classified_subscription_noise', 'high', [], sourceRole, {
      suppressionReason: 'Subscription noise classification',
    });
    logRelevanceDiagnostics(event, result);
    return result;
  }

  const matchedNames = collectMatchedNames(event, text);
  const matchedChildren = matchingChildrenInText(text);
  const gradeNumbers = extractGradeNumbers(text);
  const gradeMismatch =
    gradeNumbers.length > 0 &&
    !householdMatchesGrades(gradeNumbers) &&
    matchedChildren.length === 0;

  const teamSnapSource = isTeamSnapOrSportsCalendar(
    event.sourceCalendarName,
    displayLabel,
  );
  const sportsChild = inferChildFromSportsTitle(title, event.location);
  const sportsActivity = detectSportsActivityType(
    title,
    event.location,
    event.sourceCalendarName,
  );

  if (
    teamSnapSource &&
    (sportsChild || isGenericLeagueScheduleTitle(title) || sportsActivity !== null)
  ) {
    const household = sportsChild
      ? [sportsChild.name, 'Ryan', 'Crystal']
      : ['Ryan', 'Crystal'];
    const unique = [...new Set([...matchedNames, ...household])];
    const result = buildResult(
      'high',
      sportsChild
        ? 'teamsnap_hockey_child_match'
        : 'teamsnap_hockey_sports_source',
      sportsChild?.confidence ?? 'medium',
      unique,
      'commitment',
      {
        householdMatch: sportsChild?.name ?? 'household_sports',
        teamsnapDetected: true,
        sportsChildInference: sportsChild?.reason,
        personInferenceConfidence: sportsChild?.confidence,
      },
    );
    logRelevanceDiagnostics(event, result);
    return result;
  }

  if (schoolSource) {
    if (isSchoolInformationalFeed(title, event.description)) {
      const result = buildResult(
        'low',
        'school_informational_feed',
        'high',
        [],
        'context',
        {
          suppressionReason: 'School informational feed',
          gradeSignals: gradeNumbers,
        },
      );
      logRelevanceDiagnostics(event, result);
      return result;
    }

    if (gradeMismatch) {
      const result = buildResult(
        'low',
        'unrelated_grade_level',
        'high',
        [],
        'context',
        {
          suppressionReason: `No household child in grade(s) ${gradeNumbers.join(', ')}`,
          gradeSignals: gradeNumbers,
          householdMatch: 'none',
        },
      );
      logRelevanceDiagnostics(event, result);
      return result;
    }

    const connection = evaluateSchoolHouseholdConnection(title, event.description);

    if (!connection.connected) {
      const result = buildResult(
        'low',
        'school_no_household_connection',
        'high',
        [],
        'context',
        {
          suppressionReason: 'No child, grade, activity, or parent connection',
          gradeSignals: gradeNumbers.length > 0 ? gradeNumbers : undefined,
          householdMatch: 'none',
        },
      );
      logRelevanceDiagnostics(event, result);
      return result;
    }

    const strongConnection = connection.reasons.some((r) =>
      [
        'child_named',
        'child_grade_match',
        'parent_attendance',
        'sports_participation',
        'performance',
        'family_logistics',
      ].includes(r),
    );

    const score: RelevanceLevel = strongConnection ? 'high' : 'medium';
    const result = buildResult(
      score,
      `school_household_${connection.reasons[0]}`,
      'high',
      matchedNames,
      'commitment',
      {
        householdMatch: connection.reasons.join(', '),
        gradeSignals: gradeNumbers.length > 0 ? gradeNumbers : undefined,
      },
    );
    logRelevanceDiagnostics(event, result);
    return result;
  }

  // Non-school calendars
  let score: RelevanceLevel = 'medium';
  let reason = 'calendar_commitment_default';
  let confidence: Confidence = 'medium';

  if (matchedChildren.length > 0 || matchedNames.length > 0) {
    score = 'high';
    reason = 'household_member_present';
    confidence = 'high';
  }

  if (FAMILY_ACTIVITY.some((s) => lower.includes(s)) && matchedChildren.length > 0) {
    score = 'high';
    reason = 'family_activity_child_match';
    confidence = 'high';
  }

  const attr = event.attribution;
  if (
    attr?.ownerType === 'person' &&
    attr.ownerConfidence === 'high' &&
    attr.ownerDisplayName
  ) {
    score = 'high';
    reason = 'high_confidence_owner';
    confidence = 'high';
  }

  if (event.inferredLifeDomain === 'work' || event.inferredLifeDomain === 'community') {
    if (score === 'medium') {
      score = 'high';
      reason = 'work_or_community_commitment';
    }
  }

  if (
    event.peopleImpact === 'HIGH' ||
    event.timingSensitivity === 'high'
  ) {
    if (score !== 'high') score = 'medium';
    reason = 'timing_or_people_pressure';
  }

  if (gradeMismatch) {
    score = 'low';
    reason = 'unrelated_grade_mention';
    confidence = 'medium';
  }

  if (
    lower.includes('announcement') &&
    matchedNames.length === 0 &&
    !FAMILY_ACTIVITY.some((s) => lower.includes(s))
  ) {
    score = 'low';
    reason = 'generic_announcement';
    confidence = 'medium';
  }

  const knownInText = matchKnownPeopleInText(text);
  if (knownInText.length === 0 && matchedNames.length === 0 && event.peopleImpact === 'NONE') {
    if (
      (event.inferredLifeDomain === 'personal' || event.inferredLifeDomain === 'health') &&
      score === 'medium'
    ) {
      score = 'low';
      reason = 'no_household_connection';
      confidence = 'low';
    }
  }

  const result = buildResult(score, reason, confidence, matchedNames, sourceRole, {
    householdMatch: matchedNames.length > 0 ? matchedNames.join(', ') : 'none',
    gradeSignals: gradeNumbers.length > 0 ? gradeNumbers : undefined,
  });
  logRelevanceDiagnostics(event, result);
  return result;
}

/** Events must be explicitly relevant — never default to visible. */
export function isHouseholdRelevant(event: MeridianCalendarEvent): boolean {
  return event.relevance?.isRelevant === true;
}
