import type { FocusItemData, OverloadState, ScoredFocusItemData } from './types';
import { scoreItem } from './scoreItem';

/**
 * Score and rank a list of items.
 *
 * Overload-aware sequencing rules (HIGH state):
 * - Avoids stacking multiple high-energy items at top
 * - Prioritizes immediate relational responsibilities
 * - Surfaces emotional relief opportunities
 * - Suppresses non-critical complexity
 *
 * Max 3 items returned — Focus screen never shows more.
 */
export function sortByPriority(
  items: FocusItemData[],
  overloadState: OverloadState = 'MEDIUM',
  maxItems = 3,
): ScoredFocusItemData[] {
  const scored = items
    .filter((item) => !item.completed)
    .map((item) => scoreItem(item, overloadState));

  // Primary sort: total score descending
  const sorted = scored.sort((a, b) => b.priorityScore.total - a.priorityScore.total);

  // Post-sort: overload suppression pass
  // When HIGH overload — if top item is HIGH energy, check if the next item
  // is LOW/MEDIUM energy with comparable priority (within 15%). If so, swap.
  if (overloadState === 'HIGH' && sorted.length >= 2) {
    const first = sorted[0];
    const second = sorted[1];
    const firstIsHighEnergy = first.intelligence.estimatedEnergy === 'HIGH';
    const secondIsLowEnergy = second.intelligence.estimatedEnergy !== 'HIGH';
    const scoreGap = first.priorityScore.total - second.priorityScore.total;
    const gapThreshold = first.priorityScore.total * 0.12;

    if (firstIsHighEnergy && secondIsLowEnergy && scoreGap <= gapThreshold) {
      sorted[0] = second;
      sorted[1] = first;
    }
  }

  return sorted.slice(0, maxItems);
}
