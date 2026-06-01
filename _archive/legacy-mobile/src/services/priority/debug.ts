import type { ScoredFocusItemData } from './types';

/**
 * Development-only debug helper for priority engine tuning.
 * No-ops in production. Safe to leave in call sites.
 *
 * Usage:
 *   debugPriority(scored); // inside FocusStack or wherever items are ranked
 *
 * Output (dev only):
 *   ┌─ Meridian Priority Debug ──────────────────────────────
 *   │ #1 Grace pickup at 5:15
 *   │    Score: 313  |  Dominant: contextBonus
 *   │    Components: urgency=36 emotional=45 people=88 due=80 momentum=24 energy=-7 bonus=47
 *   │    Reasons: High people impact within timing window · Protected family commitment
 *   │
 *   │ #2 Review payment due tomorrow
 *   │    Score: 162  |  Dominant: peopleImpact
 *   │    Components: ...
 *   └────────────────────────────────────────────────────────
 */
export function debugPriority(items: ScoredFocusItemData[]): void {
  if (!__DEV__) return;

  console.group('%c Meridian Priority Debug', 'color: #A0B0C4; font-weight: 600;');
  items.forEach((item, index) => {
    const s = item.priorityScore;
    const c = s.components;
    console.log(
      `#${index + 1} ${item.title}\n` +
      `   Score: ${Math.round(s.total)}  |  Dominant: ${s.dominantFactor}  |  Visual: ${item.visualUrgency}\n` +
      `   urgency=${c.urgency}  emotional=${c.emotionalWeight}  people=${c.peopleImpact}  ` +
      `due=${c.dueProximity}  momentum=${c.momentumValue}  energy=${c.energyCost}  bonus=${c.contextBonus}\n` +
      `   Reasons: ${s.reasons.join(' · ')}`,
    );
  });
  console.groupEnd();
}

/**
 * Lightweight score assertion for automated tuning / future test integration.
 * Returns true if ordering matches expected ID order.
 */
export function assertPriorityOrder(
  scored: ScoredFocusItemData[],
  expectedIdOrder: string[],
): boolean {
  const actualOrder = scored.map((i) => i.id);
  const matches = expectedIdOrder.every((id, idx) => actualOrder[idx] === id);
  if (__DEV__ && !matches) {
    console.warn(
      '[Meridian Priority] Order mismatch.\n' +
      `  Expected: ${expectedIdOrder.join(' → ')}\n` +
      `  Actual:   ${actualOrder.join(' → ')}`,
    );
  }
  return matches;
}
