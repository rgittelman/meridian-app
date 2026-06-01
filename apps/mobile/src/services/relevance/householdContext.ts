import { safeLower } from '@/utils/safeString';

export type HouseholdMemberProfile = {
  name: string;
  personId: string;
  role: 'parent' | 'child';
  /** Current school grade levels for age-relevance checks (e.g. Reagan → 6). */
  schoolGrades: number[];
};

/**
 * Meridian household — used for relevance, not contact management.
 * Child context: Grace (school/volleyball), Reagan (6th/cheer), Quinn (hockey/football), Hudson (hockey/football).
 */
export const HOUSEHOLD_MEMBERS: HouseholdMemberProfile[] = [
  { name: 'Ryan', personId: 'ryan', role: 'parent', schoolGrades: [] },
  { name: 'Crystal', personId: 'crystal', role: 'parent', schoolGrades: [] },
  { name: 'Grace', personId: 'grace', role: 'child', schoolGrades: [8] },
  { name: 'Reagan', personId: 'reagan', role: 'child', schoolGrades: [6] },
  { name: 'Quinn', personId: 'quinn', role: 'child', schoolGrades: [] },
  { name: 'Hudson', personId: 'hudson', role: 'child', schoolGrades: [] },
];

export const HOUSEHOLD_CHILDREN = HOUSEHOLD_MEMBERS.filter((m) => m.role === 'child');

export function memberByPersonId(personId: string): HouseholdMemberProfile | undefined {
  return HOUSEHOLD_MEMBERS.find((m) => m.personId === safeLower(personId));
}

export function memberByName(name: string): HouseholdMemberProfile | undefined {
  const key = safeLower(name);
  return HOUSEHOLD_MEMBERS.find((m) => m.personId === key);
}

/** Extract grade numbers from titles like "8th Grade Final Exams". */
export function extractGradeNumbers(text: string): number[] {
  const grades = new Set<number>();
  const patterns = [
    /\b(\d{1,2})(?:st|nd|rd|th)\s*grade\b/gi,
    /\bgrade\s*(\d{1,2})\b/gi,
  ];
  for (const re of patterns) {
    let match: RegExpExecArray | null;
    const regex = new RegExp(re.source, re.flags);
    while ((match = regex.exec(text)) !== null) {
      const n = parseInt(match[1], 10);
      if (n >= 1 && n <= 12) grades.add(n);
    }
  }
  return Array.from(grades);
}

/** True if any household child is in one of the grades mentioned. */
export function householdMatchesGrades(grades: number[]): boolean {
  if (grades.length === 0) return false;
  return HOUSEHOLD_CHILDREN.some((child) =>
    child.schoolGrades.some((g) => grades.includes(g)),
  );
}

/** Named child appears in text. */
export function matchingChildrenInText(text: string): HouseholdMemberProfile[] {
  const lower = text.toLowerCase();
  return HOUSEHOLD_CHILDREN.filter((c) => {
    const re = new RegExp(`\\b${c.name}\\b`, 'i');
    return re.test(lower);
  });
}
