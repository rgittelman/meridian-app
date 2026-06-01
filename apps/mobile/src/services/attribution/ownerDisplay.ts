import type { EventAttribution } from '@/types/attribution';
import { isKnownPersonName } from '@/services/people/knownPeople';

/** User-visible owner label — never invent; Unknown when evidence is weak. */
export function resolveOwnerDisplayLabel(
  attribution: EventAttribution | undefined,
): string | null {
  if (!attribution) return null;

  if (
    attribution.ownerType === 'person' &&
    attribution.ownerDisplayName &&
    isKnownPersonName(attribution.ownerDisplayName) &&
    attribution.ownerConfidence !== 'low'
  ) {
    return attribution.ownerDisplayName;
  }

  if (attribution.ownerType === 'family' && attribution.ownerConfidence !== 'low') {
    return 'Family';
  }

  if (
    attribution.ownerType === 'community' &&
    attribution.ownerConfidence === 'high'
  ) {
    return null;
  }

  return null;
}

export function shouldShowOwnerLine(attribution: EventAttribution | undefined): boolean {
  return resolveOwnerDisplayLabel(attribution) !== null;
}
