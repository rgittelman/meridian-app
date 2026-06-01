/**
 * Focus card action language — shared by tap buttons and swipe affordances.
 *
 * Emotional intent:
 * - Hold: Meridian safely keeps this for later (snooze path)
 * - Handled: quiet release / resolution (complete path)
 */

export const FOCUS_ACTION_LABELS = {
  hold: 'Hold',
  handled: 'Handled',
} as const;

export function focusActionA11yHold(title: string): string {
  return `Hold ${title} for later`;
}

export function focusActionA11yHandled(title: string): string {
  return `Mark ${title} as handled`;
}
