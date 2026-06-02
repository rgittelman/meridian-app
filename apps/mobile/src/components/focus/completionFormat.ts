/**
 * Meridian — completion label formatting
 *
 * Pure helper used by CompletionToast to format the item title into
 * a toast-safe string that always ends with ✓.
 *
 * Design:
 * - Short titles  → "Pay mortgage ✓"
 * - Long titles   → "Grace volleyball tournament… ✓"
 * - Missing title → "Completed ✓"
 *
 * The pill toast has limited horizontal space (~240 px at default scale).
 * Truncating at 28 characters keeps the ✓ visible on all device widths
 * and leaves room for the Undo action.
 */

const TITLE_MAX = 28;

/**
 * Formats a completion title for display in CompletionToast.
 *
 * @param title - The raw item title (may be null/undefined/empty).
 * @returns A display string guaranteed to end with " ✓".
 */
export function formatCompletionLabel(title: string | null | undefined): string {
  const trimmed = title?.trim() ?? '';
  if (!trimmed) return 'Completed ✓';
  if (trimmed.length <= TITLE_MAX) return `${trimmed} ✓`;
  return `${trimmed.slice(0, TITLE_MAX).trimEnd()}… ✓`;
}
