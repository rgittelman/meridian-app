import type { LifeObject } from '@/types/capture';
import type { PrepReadinessState } from '@/types/prep';
import type { PreparationWindow } from '@/types/prep';

function activeLinkedCaptures(captures: readonly LifeObject[]): LifeObject[] {
  return captures.filter((c) => c.status !== 'done' && c.status !== 'archived');
}

export function computePrepReadiness(
  linkedCaptures: readonly LifeObject[],
  window: PreparationWindow,
): PrepReadinessState {
  if (!window.isActive && window.hoursUntilStart > window.opensHoursBefore) {
    return 'not_yet_relevant';
  }

  const active = activeLinkedCaptures(linkedCaptures);

  if (active.length === 0) {
    return linkedCaptures.length > 0 ? 'ready' : 'no_prep_detected';
  }

  if (active.length >= 2) return 'needs_attention';

  const weight = active[0].parse.emotionalWeight?.value;
  if (weight === 'HIGH' || weight === 'CRITICAL') return 'needs_attention';

  return 'mostly_ready';
}

export function readinessFromEventAndCaptures(
  linkedCaptures: readonly LifeObject[],
  window: PreparationWindow,
): PrepReadinessState {
  const base = computePrepReadiness(linkedCaptures, window);

  if (base === 'no_prep_detected' && window.isActive && linkedCaptures.length === 0) {
    return 'no_prep_detected';
  }

  if (base === 'ready' && window.isActive && activeLinkedCaptures(linkedCaptures).length === 0) {
    return 'ready';
  }

  return base;
}
