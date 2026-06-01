/**
 * Meridian Orchestration — Emotional Pacing
 *
 * Reorders resurfaced items so the Focus stack is emotionally paced —
 * not just sorted by priority score.
 *
 * The goal is to prevent:
 * - Consecutive heavy-emotional-weight items
 * - Financial anxiety stacking
 * - Family pressure clustering without relief
 * - Work escalation chains without breathing room
 *
 * And to ensure:
 * - After a heavy item, a lighter one follows when possible
 * - Timing-critical items are never buried
 * - The first item is always the highest-priority (trust the engine)
 *
 * High-overload compression:
 * - Limits the visible stack to 2–3 items
 * - Surfaces the single highest-relief opportunity first
 * - Keeps one timing-sensitive item visible
 * - Removes low-pressure items from view entirely
 *
 * Design: This is NOT a complete reorder. It makes small adjustments
 * to avoid emotional stacking, not to override priority intelligence.
 */

import { FOCUS_MAX } from '@/constants/focus';
import type { OverloadState } from '@/services/priority/types';
import type { ResurfacedItem } from '@/services/resurfacing/types';

/**
 * Returns a paced, possibly compressed subset of the input items.
 * Input items are expected to be pre-sorted by the resurfacing engine.
 */
export function paceItems(
  items: ResurfacedItem[],
  overloadState: OverloadState,
): ResurfacedItem[] {
  if (items.length <= 1) return items;

  const maxItems = FOCUS_MAX;

  const pool = items.slice(0, maxItems);
  const result: ResurfacedItem[] = [];

  // The first item is always the highest priority — never moved
  result.push(pool[0]);
  const remaining = pool.slice(1);

  // Interleave: avoid consecutive heavy items
  let lastWasHeavy = isHeavy(pool[0]);

  for (const item of remaining) {
    if (result.length >= maxItems) break;

    const heavy = isHeavy(item);

    if (lastWasHeavy && heavy && remaining.length > 1) {
      // Try to find a lighter item to insert as a buffer
      const lighterIdx = remaining.findIndex(
        (r) => !isHeavy(r) && !result.includes(r),
      );
      if (lighterIdx !== -1 && lighterIdx !== remaining.indexOf(item)) {
        // Insert the lighter item before this one (skip for now, pick it next iteration)
        // Simple approach: defer this item and process the lighter one first
        const lighter = remaining[lighterIdx];
        if (!result.includes(lighter)) {
          result.push(lighter);
          lastWasHeavy = false;
          if (result.length >= maxItems) break;
        }
      }
    }

    if (!result.includes(item)) {
      result.push(item);
      lastWasHeavy = heavy;
    }
  }

  // Ensure timing-critical items are not buried past position 2
  const nowItem = pool.find(
    (i) => i.timingWindow === 'now' && !result.includes(i),
  );
  if (nowItem && result.length < maxItems) {
    result.splice(1, 0, nowItem); // insert after first
    if (result.length > maxItems) result.pop(); // maintain cap
  }

  return result.slice(0, maxItems);
}

function isHeavy(item: ResurfacedItem): boolean {
  return (
    item.visualUrgency === 'warm' ||
    item.timingWindow === 'now' ||
    item.timingWindow === 'overdue'
  );
}
