import type { NotificationCandidate } from '@/types/notification';

export type ConstitutionalCheckResult = {
  pass: boolean;
  failureReason: string | null;
};

const GUILT_PATTERNS = [
  /\byou still haven'?t\b/i,
  /\bnot completed\b/i,
  /\boverdue\b/i,
  /\bmissed\b/i,
  /\bwe miss you\b/i,
  /\bstreak\b/i,
  /\b\d+\s+things?\s+to\s+do\b/i,
  /\b\d+\s+tasks?\b/i,
  /\bopen loops?\b/i,
  /\breminder:\s*complete\b/i,
];

const ALARMIST_PATTERNS = [
  /\burgent!\b/i,
  /\balert!\b/i,
  /\bwarning!\b/i,
  /\bcritical!\b/i,
  /\bdon'?t forget\b/i,
  /\blast chance\b/i,
];

function allCopy(candidate: NotificationCandidate): string {
  return [
    candidate.primaryLine,
    candidate.secondaryLine,
    ...candidate.additionalLines,
    candidate.interruptionReason,
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Phase 11 — every candidate must earn interruption constitutionally.
 * Failure → suppress with constitutional_failure.
 */
export function evaluateConstitutionalCompliance(
  candidate: NotificationCandidate,
  options: {
    recentlyOpenedApp: boolean;
    openedWithinTwoWeeks: boolean;
  },
): ConstitutionalCheckResult {
  // Capture reminders are explicitly user-requested — they are constitutional
  // by definition. The user decided this interruption is worth it.
  if (candidate.type === 'capture_reminder') {
    return { pass: true, failureReason: null };
  }

  const copy = allCopy(candidate);

  if (GUILT_PATTERNS.some((p) => p.test(copy))) {
    return { pass: false, failureReason: 'backward_or_guilt_framing' };
  }

  if (ALARMIST_PATTERNS.some((p) => p.test(copy))) {
    return { pass: false, failureReason: 'alarmist_framing' };
  }

  if (candidate.type === 'evening_wind_down' && /\btoday\b/i.test(copy)) {
    const backward = /\b(still|haven'?t|undone|incomplete|left)\b/i.test(copy);
    if (backward) {
      return { pass: false, failureReason: 'evening_not_future_facing' };
    }
  }

  if (!candidate.primaryLine?.trim()) {
    return { pass: false, failureReason: 'missing_primary_commitment' };
  }

  const reducesStress =
    candidate.type === 'morning_brief' ||
    candidate.type === 'evening_wind_down' ||
    candidate.type === 'transition_awareness' ||
    candidate.conflictRisk > 0;

  const preventsProblem =
    candidate.type === 'critical_commitment_protection' ||
    candidate.conflictRisk > 0.5;

  if (!reducesStress && !preventsProblem) {
    return { pass: false, failureReason: 'no_stress_reduction_or_protection' };
  }

  if (options.recentlyOpenedApp && candidate.type !== 'critical_commitment_protection') {
    if (candidate.householdImpact === 'none' || candidate.householdImpact === 'low') {
      return { pass: false, failureReason: 'silence_better_after_recent_open' };
    }
  }

  if (!options.openedWithinTwoWeeks && candidate.type === 'transition_awareness') {
    if (candidate.confidence === 'low') {
      return { pass: false, failureReason: 'stale_context_low_confidence' };
    }
  }

  return { pass: true, failureReason: null };
}
