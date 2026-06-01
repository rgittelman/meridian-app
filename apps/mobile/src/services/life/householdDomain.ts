import { HOUSEHOLD_CHILDREN } from '@/services/relevance/householdContext';
import { safeLower } from '@/utils/safeString';

/** Child names that may trigger Family domain — not adult parents. */
export const HOUSEHOLD_CHILD_PERSON_IDS = new Set(
  HOUSEHOLD_CHILDREN.map((c) => c.personId),
);

export function isHouseholdChildPerson(name: string | null | undefined): boolean {
  if (!name) return false;
  return HOUSEHOLD_CHILD_PERSON_IDS.has(safeLower(name));
}

export function householdChildNamesInList(names: readonly string[]): string[] {
  return names.filter((n) => isHouseholdChildPerson(n));
}
