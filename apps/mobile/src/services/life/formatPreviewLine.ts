import { truncateAtNaturalBoundary } from '@/utils/text/truncateForDisplay';
import { isDevEnvironment } from '@/utils/isDev';

/** Max chars for a single Life domain preview line before word-safe shortening. */
const LIFE_PREVIEW_MAX_CHARS = 42;

/**
 * Keeps domain card summaries readable — full short titles when possible,
 * word-boundary ellipsis only when necessary.
 */
export function formatLifePreviewLine(title: string): string {
  const trimmed = title.trim();
  if (trimmed.length <= LIFE_PREVIEW_MAX_CHARS) return trimmed;
  return truncateAtNaturalBoundary(trimmed, LIFE_PREVIEW_MAX_CHARS);
}

export function logLifePreviewSummary(
  domainLabel: string,
  lines: string[],
  overflow: string | null,
): void {
  if (!isDevEnvironment()) return;
  console.log(`[Meridian:life-preview] ${domainLabel}`, { lines, overflow });
}
