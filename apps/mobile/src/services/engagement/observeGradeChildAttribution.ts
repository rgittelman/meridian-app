import {
  extractGradeNumbers,
  HOUSEHOLD_CHILDREN,
  type HouseholdMemberProfile,
} from '@/services/relevance/householdContext';
import { isSchoolCalendarSource } from '@/services/relevance/isSchoolSource';
import { isSchoolInformationalFeed } from '@/services/relevance/schoolHouseholdConnection';
import type { MeridianCalendarEvent } from '@/types/calendar';

export type GradeChildObservation = {
  text: string;
  child: HouseholdMemberProfile;
  grade: number;
};

/**
 * O09 — Grade → Child Attribution
 *
 * Scans the current week's events for school-sourced entries whose titles
 * contain an explicit grade number that maps to exactly one household child.
 * Returns at most one observation. Silences when the signal is ambiguous.
 *
 * Gates (in order):
 *  1. Calendar data must not be stale (caller responsibility — pass empty array when stale).
 *  2. Event must come from a school calendar source.
 *  3. Event must not be informational/feed noise.
 *  4. Event title must contain at least one grade number.
 *  5. Exactly one household child must own that grade.
 */
export function observeGradeChildAttribution(
  weekEvents: MeridianCalendarEvent[],
): GradeChildObservation | null {
  for (const event of weekEvents) {
    if (!isSchoolCalendarSource(event.sourceCalendarName, event.sourceCalendarDisplayLabel)) {
      continue;
    }

    if (isSchoolInformationalFeed(event.title, event.description ?? undefined)) {
      continue;
    }

    const grades = extractGradeNumbers(event.title);
    if (grades.length === 0) continue;

    for (const grade of grades) {
      const matches = HOUSEHOLD_CHILDREN.filter((child) =>
        child.schoolGrades.includes(grade),
      );

      if (matches.length !== 1) continue;

      const child = matches[0];
      const suffix = gradeSuffix(grade);
      return {
        text: `Something for ${grade}${suffix} grade is on the calendar this week — likely ${child.name}'s.`,
        child,
        grade,
      };
    }
  }

  return null;
}

function gradeSuffix(n: number): string {
  if (n === 11 || n === 12 || n === 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}
