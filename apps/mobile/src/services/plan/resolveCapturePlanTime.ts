import type { Confidence } from '@/types/capture';
import type { LifeObject } from '@/types/capture';
import { planForwardBounds } from '@/services/calendar/planBounds';
import { logPlanPromotionEligibility } from './planDebug';
import {
  collectPromotionEligibilitySignals,
  derivePromotedBecause,
  detectActionableIntent,
  detectHealthSelfManagement,
  detectMeaningfulDomainSignal,
  parseClockFromScheduleText,
  resolveDayStartFromScheduleText,
  scheduleTextFor,
  timingLabel,
  VAGUE_ONLY_PATTERN,
  type PromotionEligibilitySignals,
  type PromotionRejectionReason,
  type PromotedBecause,
} from './promotionEligibilitySignals';

export type ResolvedCapturePlanTime = {
  startTime: Date;
  displayTime: string;
  isApproximate: boolean;
  /** exact = high confidence day+time; soft_day = medium confidence day-only */
  placementTier: 'exact' | 'soft_day';
};

export type PromotionEligibilityResult = {
  eligible: boolean;
  reason: string;
  rejectionReason?: PromotionRejectionReason;
  promotedBecause?: PromotedBecause;
  signals: PromotionEligibilitySignals;
};

const VAGUE_WEEK_PATTERN =
  /\b(this|next)\s+(week|month|weekend)\b/i;

const MEDIUM_VAGUE_LABEL =
  /^(this|next)\s+(week|month|weekend)|^in\s+\d|^in\s+(a|an|few)\s+|^by end of/i;

function timingConfidence(item: LifeObject): Confidence | null {
  return item.parse.timing?.confidence ?? null;
}

function formatClockTime(date: Date, approximate: boolean): string {
  const time = date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  return approximate ? `~${time}` : time;
}

function formatSoftDayDisplay(
  dayStart: Date,
  label: string,
  reference: Date,
): string {
  const lower = label.toLowerCase();

  // Deadline framing — "before [day]" or "by [day]"
  const isDeadline =
    lower.startsWith('before ') || (lower.startsWith('by ') && !/^by \d/.test(lower));
  if (isDeadline) {
    if (/\btomorrow\b/.test(lower)) return 'By tomorrow';
    if (/\btoday\b/.test(lower)) return 'By today';
    const weekday = dayStart.toLocaleDateString(undefined, { weekday: 'long' });
    return `By ${weekday}`;
  }

  if (/\btomorrow\b/.test(lower)) return 'Tomorrow · flexible';
  if (/\btoday\b/.test(lower) || /\btonight\b/.test(lower)) return 'Today · flexible';

  const today = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  const target = new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate());
  if (target.getTime() === today.getTime()) return 'Today · flexible';

  const weekday = dayStart.toLocaleDateString(undefined, { weekday: 'long' });
  return `${weekday} · flexible`;
}

function countClockMentionsInLabel(label: string): number {
  const lower = label.toLowerCase();
  const matches = lower.match(
    /\b(?:at|by|before|after|around|about)?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/gi,
  );
  if (!matches || matches.length <= 1) return matches?.length ?? 0;

  const keys = new Set<string>();
  for (const m of matches) {
    const parts = m.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (parts) keys.add(`${parts[1]}:${parts[2] ?? '00'}:${parts[3] ?? ''}`);
  }
  return keys.size;
}

function isWithinPlanWindow(startTime: Date, reference: Date): boolean {
  const { todayStartMs, planEndMs } = planForwardBounds(reference);
  return (
    startTime.getTime() >= todayStartMs - 60_000 &&
    startTime.getTime() <= planEndMs + 86_400_000
  );
}

function qualifiesForPromotion(
  item: LifeObject,
  signals: PromotionEligibilitySignals,
  confidence: Confidence,
): boolean {
  // Primary path — meaningful domain signal unlocks all promotion routes
  if (signals.meaningfulDomainSignal) {
    if (signals.healthSelfManagement && signals.exactDayDetected) return true;
    if (confidence === 'high' && signals.exactDayDetected && signals.exactClockDetected) return true;
    if (signals.highConfidenceDayOnly) return true;
    if (detectActionableIntent(item)) return true;
    return false;
  }

  // Secondary path — strong action verb + named day is sufficient even without a
  // domain signal. This handles clear work/personal deadlines like
  // "Submit expense report before Friday" where category confidence is weak.
  // Guard: vague captures ("think about budget", "maybe call someday") are rejected
  // by the VAGUE_ONLY_PATTERN gate earlier in evaluatePromotionEligibility.
  if (signals.exactDayDetected && detectActionableIntent(item)) {
    return true;
  }

  return false;
}

/**
 * Resolves plan placement from parse.timing (label + confidence).
 * Never uses isoHint. Low confidence never resolves.
 */
export function resolveCapturePlanTime(
  item: LifeObject,
  reference = new Date(),
): ResolvedCapturePlanTime | null {
  const timing = item.parse.timing;
  const confidence = timing?.confidence;
  const label = timingLabel(item);
  const scheduleText = scheduleTextFor(item);

  if (!timing || !label || !confidence) return null;

  if (confidence === 'low') return null;

  const dayStart = resolveDayStartFromScheduleText(scheduleText, reference);
  if (!dayStart) return null;

  if (confidence === 'medium') {
    if (MEDIUM_VAGUE_LABEL.test(label.toLowerCase())) return null;

    const softStart = new Date(dayStart);
    softStart.setHours(9, 0, 0, 0);
    if (!isWithinPlanWindow(softStart, reference)) return null;

    return {
      startTime: softStart,
      displayTime: formatSoftDayDisplay(softStart, label, reference),
      isApproximate: true,
      placementTier: 'soft_day',
    };
  }

  const clock = parseClockFromScheduleText(scheduleText);
  if (!clock) {
    const softStart = new Date(dayStart);
    softStart.setHours(9, 0, 0, 0);
    if (!isWithinPlanWindow(softStart, reference)) return null;

    return {
      startTime: softStart,
      displayTime: formatSoftDayDisplay(softStart, label, reference),
      isApproximate: true,
      placementTier: 'soft_day',
    };
  }

  const startTime = new Date(dayStart);
  startTime.setHours(clock.hour, clock.minute, 0, 0);
  if (!isWithinPlanWindow(startTime, reference)) return null;

  return {
    startTime,
    displayTime: formatClockTime(startTime, clock.isApproximate),
    isApproximate: clock.isApproximate,
    placementTier: 'exact',
  };
}

/**
 * Phase 1 — eligibility using parse.timing confidence + schedule signals.
 */
export function evaluatePromotionEligibility(
  item: LifeObject,
  reference = new Date(),
): PromotionEligibilityResult {
  const signals = collectPromotionEligibilitySignals(item, reference);

  if (item.status === 'done' || item.status === 'archived') {
    return {
      eligible: false,
      reason: 'inactive_capture',
      rejectionReason: 'done_or_archived',
      signals,
    };
  }

  if (item.linkedCalendarEventId && item.relationshipConfidence === 'high') {
    return {
      eligible: false,
      reason: 'calendar_linked',
      rejectionReason: 'already_on_calendar',
      signals,
    };
  }

  if (item.parse.isRoutine || item.recurrence) {
    return {
      eligible: false,
      reason: 'recurring_language',
      rejectionReason: 'recurring_not_specific_instance',
      signals,
    };
  }

  const confidence = timingConfidence(item);
  const label = timingLabel(item);

  if (!confidence || !label) {
    logPlanPromotionEligibility(item.id, 'none', false, 'no_timing', signals);
    return {
      eligible: false,
      reason: 'no_timing',
      rejectionReason: 'no_timing',
      signals,
    };
  }

  if (confidence === 'low') {
    logPlanPromotionEligibility(item.id, confidence, false, 'low_confidence_bare_time', signals);
    return {
      eligible: false,
      reason: 'timing_low',
      rejectionReason: 'low_confidence_bare_time',
      signals,
    };
  }

  // Guard: reject when the resolved timing label is itself vague ("this week", "next month").
  // Tests the resolved label — NOT item.raw — so that vague language in the capture body
  // (e.g. "costs this week. Due Thursday") does not poison a concretely resolved day.
  if (VAGUE_WEEK_PATTERN.test(label) && countClockMentionsInLabel(label) === 0) {
    return {
      eligible: false,
      reason: 'vague_week_window',
      rejectionReason: 'vague_timing',
      signals,
    };
  }

  if (countClockMentionsInLabel(label) > 1) {
    return {
      eligible: false,
      reason: 'multiple_times',
      rejectionReason: 'ambiguous_capture',
      signals,
    };
  }

  if (!qualifiesForPromotion(item, signals, confidence)) {
    if (VAGUE_ONLY_PATTERN.test(item.raw)) {
      return {
        eligible: false,
        reason: 'not_actionable',
        rejectionReason: 'vague_intent',
        signals,
      };
    }
    const rejectionReason: PromotionRejectionReason = !signals.meaningfulDomainSignal
      ? 'no_domain_signal'
      : 'no_action_or_event_signal';
    return {
      eligible: false,
      reason: 'not_actionable',
      rejectionReason,
      signals,
    };
  }

  const resolved = resolveCapturePlanTime(item, reference);
  if (!resolved) {
    logPlanPromotionEligibility(item.id, confidence, false, 'unresolved_schedule', signals);
    return {
      eligible: false,
      reason: 'unresolved_schedule',
      rejectionReason:
        confidence === 'medium' ? 'medium_day_unresolved' : 'high_missing_day_or_time',
      signals,
    };
  }

  const promotedBecause = derivePromotedBecause(item, signals, confidence);
  const reason =
    promotedBecause ??
    (confidence === 'medium'
      ? 'medium_confidence_day_only'
      : resolved.isApproximate
        ? 'high_confidence_day_and_window'
        : 'high_confidence_day_and_clock');

  logPlanPromotionEligibility(item.id, confidence, true, reason, signals, promotedBecause);

  return {
    eligible: true,
    reason,
    promotedBecause: promotedBecause ?? undefined,
    signals,
  };
}

export function isPromotableToPlan(item: LifeObject, reference = new Date()): boolean {
  return evaluatePromotionEligibility(item, reference).eligible;
}
