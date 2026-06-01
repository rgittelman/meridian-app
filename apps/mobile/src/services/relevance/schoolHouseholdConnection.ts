import {
  extractGradeNumbers,
  householdMatchesGrades,
  HOUSEHOLD_CHILDREN,
  matchingChildrenInText,
  type HouseholdMemberProfile,
} from './householdContext';
import { matchKnownPeopleInText } from '@/services/people/knownPeople';
import { safeLower, safeTrim } from '@/utils/safeString';

/** Per-child activities for school-calendar relevance (not generic school feed). */
const CHILD_ACTIVITY_KEYWORDS: Record<string, string[]> = {
  grace: ['volleyball', 'soccer', 'cheer'],
  reagan: ['cheer', 'volleyball', '6th', 'sixth'],
  quinn: ['hockey', 'football'],
  hudson: ['hockey', 'football'],
};

const PARENT_ATTENDANCE = [
  'parent teacher',
  'parent-teacher',
  'parents night',
  "parent's night",
  'parent night',
  'conference',
  'open house',
  'meet the teacher',
  'back to school night',
  'iep',
  '504 plan',
  'curriculum night',
];

const PERFORMANCE_SPORTS = [
  'performance',
  'concert',
  'recital',
  'talent show',
  'play',
  'musical',
];

const SPORTS_PARTICIPATION = [
  'game',
  'practice',
  'tournament',
  'match',
  'meet',
  'championship',
];

/** Informational school-feed titles — suppress unless household connection exists. */
const SCHOOL_FEED_SUPPRESS = [
  'read-a-thon',
  'readathon',
  'read a thon',
  'reward day',
  'dress down',
  'dress up day',
  'spirit week',
  'extra recess',
  'recess reward',
  'final exam',
  'final exams',
  'exam schedule',
  'testing schedule',
  'announcement',
  'newsletter',
  'district notice',
  'district-wide',
  'reminder:',
  'awareness',
  'informational',
  'fundraiser',
  'yearbook',
  'book fair',
  'spirit wear',
  'pto meeting',
  'staff appreciation',
  'teacher appreciation',
  "teacher's birthday",
  'birthday',
  'early dismissal',
  'no school',
  'school closed',
  'professional day',
  'institute day',
];

const TEACHER_STAFF_PATTERN =
  /\b(?:mrs?\.|ms\.|mr\.|dr\.)\s+[a-z][a-z'\-]+/i;

const GRADE_FIELD_TRIP =
  /\b(\d{1,2})(?:st|nd|rd|th)\s*grade\s+(?:field\s*trip|trip)\b/i;

export type SchoolHouseholdConnection = {
  connected: boolean;
  reasons: string[];
};

export function isSchoolInformationalFeed(title: string, description?: string): boolean {
  const lower = safeLower([title, safeTrim(description)].filter(Boolean).join(' '));

  if (SCHOOL_FEED_SUPPRESS.some((s) => lower.includes(s))) return true;
  if (TEACHER_STAFF_PATTERN.test(lower) && lower.includes('birthday')) return true;
  if (TEACHER_STAFF_PATTERN.test(lower) && !matchingChildrenInText(lower).length) {
    if (
      !PARENT_ATTENDANCE.some((s) => lower.includes(s)) &&
      !PERFORMANCE_SPORTS.some((s) => lower.includes(s))
    ) {
      return true;
    }
  }

  if (GRADE_FIELD_TRIP.test(lower) && !householdMatchesGrades(extractGradeNumbers(lower))) {
    return true;
  }

  return false;
}

function childActivityMatch(lower: string, children: HouseholdMemberProfile[]): boolean {
  for (const child of children) {
    const keywords = CHILD_ACTIVITY_KEYWORDS[child.personId] ?? [];
    if (!new RegExp(`\\b${child.name}\\b`, 'i').test(lower)) continue;
    if (keywords.some((k) => lower.includes(k))) return true;
  }
  return false;
}

function gradeAndActivityMatch(lower: string): boolean {
  const grades = extractGradeNumbers(lower);
  if (!householdMatchesGrades(grades)) return false;

  const activityHint = [
    ...Object.values(CHILD_ACTIVITY_KEYWORDS).flat(),
    ...SPORTS_PARTICIPATION,
    ...PERFORMANCE_SPORTS,
    'field trip',
    'conference',
  ];
  return activityHint.some((a) => lower.includes(a));
}

function sportsParticipationWithHousehold(
  lower: string,
  children: HouseholdMemberProfile[],
): boolean {
  const hasSports = SPORTS_PARTICIPATION.some((s) => lower.includes(s));
  if (!hasSports) return false;
  return children.length > 0 || householdMatchesGrades(extractGradeNumbers(lower));
}

function performanceWithHousehold(
  lower: string,
  children: HouseholdMemberProfile[],
): boolean {
  const hasPerf = PERFORMANCE_SPORTS.some((s) => lower.includes(s));
  if (!hasPerf) return false;
  return children.length > 0 || householdMatchesGrades(extractGradeNumbers(lower));
}

/**
 * School events must pass at least one household connection rule before surfacing.
 */
export function evaluateSchoolHouseholdConnection(
  title: string,
  description?: string,
): SchoolHouseholdConnection {
  const text = [title, safeTrim(description)].filter(Boolean).join(' ');
  const lower = safeLower(text);
  const reasons: string[] = [];

  const children = matchingChildrenInText(text);
  const grades = extractGradeNumbers(text);

  if (children.length > 0) {
    reasons.push('child_named');
  }

  if (grades.length > 0 && householdMatchesGrades(grades)) {
    reasons.push('child_grade_match');
  }

  if (childActivityMatch(lower, children)) {
    reasons.push('child_activity');
  }

  if (gradeAndActivityMatch(lower)) {
    reasons.push('grade_activity_match');
  }

  if (PARENT_ATTENDANCE.some((s) => lower.includes(s))) {
    reasons.push('parent_attendance');
  }

  if (sportsParticipationWithHousehold(lower, children)) {
    reasons.push('sports_participation');
  }

  if (performanceWithHousehold(lower, children)) {
    reasons.push('performance');
  }

  const householdMembers = matchKnownPeopleInText(text).filter(
    (p) => p.confidence !== 'low',
  );
  if (householdMembers.length > 0) {
    reasons.push('household_member');
  }

  if (
    lower.includes('pickup') ||
    lower.includes('pick up') ||
    lower.includes('drop off') ||
    lower.includes('dropoff')
  ) {
    if (children.length > 0 || householdMembers.length > 0) {
      reasons.push('family_logistics');
    }
  }

  return {
    connected: reasons.length > 0,
    reasons,
  };
}
