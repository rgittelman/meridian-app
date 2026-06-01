import type { FocusItemData } from './types';
import { DUE_VALUE, PEOPLE_VALUE } from './weights';

/**
 * Derives the visual urgency treatment for a FocusCard from intelligence metadata.
 * Visual urgency is NOT manually specified — it's a product of the scoring layer.
 *
 * 'time'  → people-aware + timing window (blue-accent treatment)
 * 'warm'  → financial / stress risk (amber treatment)
 * 'default' → standard (ghost dot)
 */
export function deriveVisualUrgency(
  item: FocusItemData,
): 'default' | 'time' | 'warm' {
  const intel = item.intelligence;

  const isDueToday = DUE_VALUE[intel.dueWindow] >= DUE_VALUE.TODAY;
  const isPeopleHigh = PEOPLE_VALUE[intel.peopleImpact] >= PEOPLE_VALUE.HIGH;

  // People-aware timing window → 'time'
  if (isPeopleHigh && isDueToday) return 'time';
  if (intel.isFamilyCommitment && isDueToday) return 'time';

  // Financial or explicit stress risk → 'warm'
  if (intel.isFinancial) return 'warm';
  if (intel.isStressPrevention && intel.dueWindow === 'TOMORROW') return 'warm';
  if (intel.urgency === 'CRITICAL') return 'warm';

  return 'default';
}
