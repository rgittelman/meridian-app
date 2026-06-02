import type {
  NotificationCandidate,
  NotificationSuppressionReason,
} from '@/types/notification';
import {
  DUPLICATE_AWARENESS_COOLDOWN_MS,
  IGNORED_PATTERN_COOLDOWN_MS,
  MIN_CONFIDENCE_RANK,
  MIN_INTERRUPTION_SCORE,
  RECENTLY_OPENED_APP_MS,
  RECOVERY_WINDOW_MS,
} from './constants';
import type { InterruptionScore } from '@/types/notification';
import type { NotificationIntelligenceContext } from './types';

export type SuppressionResult = {
  candidate: NotificationCandidate;
  suppressed: boolean;
  reason: NotificationSuppressionReason | null;
};

function confidenceRank(c: NotificationCandidate['confidence']): number {
  switch (c) {
    case 'high':
      return 3;
    case 'medium':
      return 2;
    default:
      return 1;
  }
}

function evaluateSuppression(
  candidate: NotificationCandidate,
  score: InterruptionScore,
  ctx: NotificationIntelligenceContext,
): NotificationSuppressionReason | null {
  if (candidate.type === 'critical_commitment_protection' && candidate.conflictRisk > 0) {
    return null;
  }

  // Capture reminders are user-requested — bypass all suppression heuristics.
  // The only valid cancellation paths are: capture resolved (generator stops
  // producing the candidate), time passed (scheduler gate), or duplicate (dedup gate).
  if (candidate.type === 'capture_reminder') {
    return null;
  }

  if (ctx.recoveryWindowUntil && Date.now() < ctx.recoveryWindowUntil) {
    if (candidate.type !== 'critical_commitment_protection') {
      return 'inside_recovery_window';
    }
  }

  const lastOpen = ctx.lastAppOpenedAt;
  if (lastOpen && Date.now() - lastOpen < RECENTLY_OPENED_APP_MS) {
    if (
      candidate.type !== 'critical_commitment_protection' &&
      score.total < MIN_INTERRUPTION_SCORE + 15
    ) {
      return 'recently_opened_app';
    }
  }

  if (candidate.householdImpact === 'none') {
    return 'low_household_impact';
  }

  if (
    candidate.householdImpact === 'low' &&
    candidate.timingSensitivity === 'low' &&
    candidate.type !== 'critical_commitment_protection'
  ) {
    return 'low_household_impact';
  }

  if (
    candidate.timingSensitivity === 'low' &&
    candidate.type === 'transition_awareness'
  ) {
    return 'low_time_sensitivity';
  }

  if (confidenceRank(candidate.confidence) < MIN_CONFIDENCE_RANK) {
    if (candidate.type !== 'critical_commitment_protection') {
      return 'insufficient_confidence';
    }
  }

  if (score.total < MIN_INTERRUPTION_SCORE) {
    if (candidate.type !== 'critical_commitment_protection') {
      return 'silence_preferred';
    }
  }

  const ignoredAt = ctx.ignoredPatterns[candidate.bundleKey];
  if (ignoredAt && Date.now() - ignoredAt < IGNORED_PATTERN_COOLDOWN_MS) {
    return 'recently_ignored_pattern';
  }

  const lastAwareness = ctx.recentAwarenessAt[candidate.bundleKey];
  if (lastAwareness && Date.now() - lastAwareness < DUPLICATE_AWARENESS_COOLDOWN_MS) {
    if (candidate.type !== 'critical_commitment_protection') {
      return 'duplicate_awareness';
    }
  }

  if (
    candidate.type === 'transition_awareness' &&
    !candidate.secondaryLine &&
    candidate.additionalLines.length === 0
  ) {
    return 'no_actionable_content';
  }

  if (ctx.overloadRecoveryActive && candidate.type !== 'critical_commitment_protection') {
    return 'inside_recovery_window';
  }

  return null;
}

/**
 * Suppression is a first-class output — every candidate is evaluated; none exist by default as SEND.
 */
export function applyNotificationSuppression(
  candidates: Array<{ candidate: NotificationCandidate; interruptionScore: InterruptionScore }>,
  ctx: NotificationIntelligenceContext,
): SuppressionResult[] {
  return candidates.map(({ candidate, interruptionScore }) => {
    const reason = evaluateSuppression(candidate, interruptionScore, ctx);
    return {
      candidate: {
        ...candidate,
        suppressionReason: reason,
      },
      suppressed: reason !== null,
      reason,
    };
  });
}
