import type { EventAttribution } from '@/types/attribution';
import { resolveOwnerDisplayLabel } from './ownerDisplay';
import { safeTrim } from '@/utils/safeString';

/** Plan card title — always the event title, never prefixed with owner. */
export function buildPlanTitleLine(title: string | null | undefined): string {
  return safeTrim(title, 'Untitled');
}

/**
 * Plan attribution line under title.
 * High-confidence person owner: "Grace · Family Calendar"
 * Otherwise source only: "Family Calendar"
 */
export function buildPlanAttributionLine(attribution: EventAttribution): string {
  const source = attribution.sourceCalendarDisplayLabel;
  const owner = resolveOwnerDisplayLabel(attribution);

  if (owner) {
    return `${owner} · ${source}`;
  }

  return source;
}

export function shouldShowOwnerOnPlan(attribution: EventAttribution): boolean {
  return resolveOwnerDisplayLabel(attribution) !== null;
}
