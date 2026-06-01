import type { Confidence, LifeObject } from '@/types/capture';
import { isHouseholdChildPerson } from '@/services/life/householdDomain';
import { textSignalsCommunity } from '@/services/life/domainSignals';
import { inferImplicitMeridiem } from '@/utils/parsing/inferImplicitMeridiem';

const DAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export const ACTION_VERBS =
  /\b(call|email|text|pay|pick\s*up|pickup|drop\s*off|dropoff|schedule|book|send|buy|register|confirm|remind|ask|review|submit|return|renew|bring|take|attend|meet)\b/i;

export const LOGISTICS_SIGNALS =
  /\b(pick\s*up|pickup|drop\s*off|dropoff|game|practice|class|lesson|hockey|soccer|swim|football|volleyball|basketball|lacrosse|baseball|tournament|registration|dentist|doctor|appointment|cheer|recital|lifeguard|training|skates|summit|meeting|visit|board\s+meeting|refill|medication)\b/i;

export const EVENT_WORK_SIGNALS =
  /\b(summit|leadership|conference|symposium|forum|offsite|workshop|seminar|keynote|presentation|board\s+meeting|team\s+meeting|client\s+meeting|site\s+visit|store\s+visit|tradeshow|expo|home\s+leadership)\b/i;

export const HEALTH_SELF_MANAGEMENT =
  /\b(medication|medicine|prescription|refill|rx)\b/i;

export const FINANCIAL_COMMITMENT_SIGNALS =
  /\b(payment|mortgage|due|budget|invoice|bill)\b/i;

export const VAGUE_ONLY_PATTERN =
  /\b(maybe|think about|remember|stuff|easier|vacation|someday|eventually|might)\b/i;

export type ParsedClock = {
  hour: number;
  minute: number;
  isApproximate: boolean;
};

export type PromotionScheduleSignals = {
  exactDayDetected: boolean;
  exactClockDetected: boolean;
  dayOnlyDetected: boolean;
  highConfidenceDayOnly: boolean;
};

export type PromotionEligibilitySignals = PromotionScheduleSignals & {
  meaningfulDomainSignal: boolean;
  actionableIntentDetected: boolean;
  healthSelfManagement: boolean;
};

export type PromotedBecause =
  | 'exact_day_exact_clock'
  | 'action_signal'
  | 'logistics_signal'
  | 'event_work_signal'
  | 'high_confidence_day_only'
  | 'health_self_management'
  | 'scheduling_intent'
  | 'child_activity_signal'   // household child detected + sport/activity logistics
  | 'action_with_day'         // strong action verb + named day (no domain signal needed)
  | 'community_signal'        // BFSC/board/swim-club + named day
  | 'deadline_day'            // "before [day]" / "by [day]" deadline framing
  | 'sports_registration';    // sports registration opens/deadline on named day

export type PromotionRejectionReason =
  | 'done_or_archived'
  | 'already_on_calendar'
  | 'recurring_not_specific_instance'
  | 'no_timing'
  | 'low_confidence_bare_time'
  | 'week_without_day'
  | 'ambiguous_multiple_clocks'
  | 'vague_timing'
  | 'no_domain_signal'
  | 'no_action_or_event_signal'
  | 'ambiguous_capture'
  | 'vague_intent'
  | 'medium_day_unresolved'
  | 'high_missing_day_or_time';

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function timingLabel(item: LifeObject): string {
  return item.parse.timing?.value.label?.trim() ?? '';
}

export function scheduleTextFor(item: LifeObject): string {
  const label = timingLabel(item);
  return `${label} ${item.raw}`.trim();
}

/** Parse clock from timing label + raw (never isoHint). */
export function parseClockFromScheduleText(text: string): ParsedClock | null {
  const lower = text.toLowerCase();

  const fuzzy = lower.match(
    /\b(?:around|about)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i,
  );
  if (fuzzy) {
    const parsed = parseHourMinute(fuzzy[1], fuzzy[2], fuzzy[3]);
    if (parsed) return { ...parsed, isApproximate: true };
  }

  const atTime = lower.match(
    /\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i,
  );
  if (atTime) {
    const parsed = parseHourMinute(atTime[1], atTime[2], atTime[3]);
    if (parsed) {
      const hasMeridiem = Boolean(atTime[3]);
      const hasMinutePrecision = Boolean(atTime[2]);
      return {
        ...parsed,
        isApproximate: !hasMeridiem && !hasMinutePrecision,
      };
    }
  }

  const implicitAt = lower.match(
    /\b(?:at|by)\s+(\d{1,2})(?::(\d{2}))?(?!\s*(?:am|pm)\b)/i,
  );
  if (implicitAt) {
    const hour = parseInt(implicitAt[1], 10);
    const minute = implicitAt[2] ? parseInt(implicitAt[2], 10) : 0;
    const mer = inferImplicitMeridiem(hour, minute);
    const parsed = parseHourMinute(implicitAt[1], implicitAt[2], mer);
    if (parsed) {
      const hasMinutePrecision = Boolean(implicitAt[2]);
      return { ...parsed, isApproximate: !hasMinutePrecision };
    }
  }

  if (/\bnoon\b/.test(lower)) {
    return { hour: 12, minute: 0, isApproximate: false };
  }

  if (/\bmidnight\b/.test(lower)) {
    return { hour: 0, minute: 0, isApproximate: false };
  }

  if (/\b(this|tomorrow)\s+morning\b/.test(lower) || /\bmorning\b/.test(lower)) {
    return { hour: 9, minute: 0, isApproximate: true };
  }

  if (/\b(this|tomorrow)\s+afternoon\b/.test(lower) || /\bafternoon\b/.test(lower)) {
    return { hour: 14, minute: 0, isApproximate: true };
  }

  if (
    /\b(this|tomorrow)\s+evening\b/.test(lower) ||
    /\btonight\b/.test(lower) ||
    /\bevening\b/.test(lower)
  ) {
    return { hour: 18, minute: 0, isApproximate: true };
  }

  if (
    /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+night\b/.test(
      lower,
    ) ||
    /\bnight\b/.test(lower)
  ) {
    return { hour: 19, minute: 0, isApproximate: true };
  }

  return null;
}

function parseHourMinute(
  hourStr: string,
  minuteStr: string | undefined,
  meridiem: string | undefined,
): { hour: number; minute: number } | null {
  let hour = parseInt(hourStr, 10);
  const minute = minuteStr ? parseInt(minuteStr, 10) : 0;
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;

  const mer = meridiem?.toLowerCase();
  if (mer === 'pm' && hour < 12) hour += 12;
  if (mer === 'am' && hour === 12) hour = 0;
  if (!mer && hour >= 1 && hour <= 11) {
    hour += 12;
  }

  return { hour, minute };
}

/** Resolve day from timing label + raw. */
export function resolveDayStartFromScheduleText(
  text: string,
  reference: Date,
): Date | null {
  const lower = text.toLowerCase();
  const today = startOfDay(reference);

  if (/\btoday\b/.test(lower) || /\btonight\b/.test(lower)) return today;

  if (/\btomorrow\b/.test(lower)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d;
  }

  if (
    /\bthis morning\b/.test(lower) ||
    /\bthis afternoon\b/.test(lower) ||
    /\bthis evening\b/.test(lower)
  ) {
    return today;
  }

  for (const [day, idx] of Object.entries(DAY_INDEX)) {
    const isNext = new RegExp(`\\bnext\\s+${day}\\b`, 'i').test(lower);
    const isPlainDay = new RegExp(`\\b${day}\\b`, 'i').test(lower);
    if (!isNext && !isPlainDay) continue;

    const refDay = reference.getDay();
    let daysUntil = (idx - refDay + 7) % 7;

    if (isNext && daysUntil === 0) {
      daysUntil = 7;
    }

    const d = new Date(today);
    d.setDate(d.getDate() + daysUntil);
    return d;
  }

  return null;
}

export function detectMeaningfulDomainSignal(item: LifeObject): boolean {
  const text = item.raw;

  if (EVENT_WORK_SIGNALS.test(text)) return true;
  if (LOGISTICS_SIGNALS.test(text)) return true;
  if (HEALTH_SELF_MANAGEMENT.test(text)) return true;
  if (FINANCIAL_COMMITMENT_SIGNALS.test(text)) return true;

  // Community signals — BFSC, board, swim club, volunteer, membership
  if (textSignalsCommunity(text)) return true;

  if (
    item.parse.people.some(
      (p) => p.confidence !== 'low' && isHouseholdChildPerson(p.value),
    )
  ) {
    return true;
  }

  const category = item.parse.category?.value;
  const categoryConfidence = item.parse.category?.confidence;
  if (
    category &&
    categoryConfidence !== 'low' &&
    (category === 'work' ||
      category === 'health' ||
      category === 'family' ||
      category === 'financial')
  ) {
    return true;
  }

  return false;
}

export function detectActionableIntent(item: LifeObject): boolean {
  const text = item.raw;
  if (item.parse.schedulingIntent) return true;
  if (ACTION_VERBS.test(text)) return true;
  if (LOGISTICS_SIGNALS.test(text)) return true;
  if (EVENT_WORK_SIGNALS.test(text)) return true;
  if (
    item.parse.people.some(
      (p) => p.confidence !== 'low' && isHouseholdChildPerson(p.value),
    )
  ) {
    return true;
  }
  if (HEALTH_SELF_MANAGEMENT.test(text)) return true;
  return false;
}

export function detectHealthSelfManagement(item: LifeObject): boolean {
  return HEALTH_SELF_MANAGEMENT.test(item.raw);
}

export function detectPromotionScheduleSignals(
  item: LifeObject,
  reference: Date,
  confidence: Confidence | null,
): PromotionScheduleSignals {
  const scheduleText = scheduleTextFor(item);
  const dayStart = resolveDayStartFromScheduleText(scheduleText, reference);
  const clock = parseClockFromScheduleText(scheduleText);

  const exactDayDetected = dayStart !== null;
  const exactClockDetected =
    clock !== null && !clock.isApproximate && confidence === 'high';
  const dayOnlyDetected =
    exactDayDetected && (clock === null || confidence !== 'high');
  const highConfidenceDayOnly =
    confidence === 'high' && exactDayDetected && clock === null;

  return {
    exactDayDetected,
    exactClockDetected,
    dayOnlyDetected,
    highConfidenceDayOnly,
  };
}

export function collectPromotionEligibilitySignals(
  item: LifeObject,
  reference: Date,
): PromotionEligibilitySignals {
  const confidence = item.parse.timing?.confidence ?? null;
  const schedule = detectPromotionScheduleSignals(item, reference, confidence);

  return {
    ...schedule,
    meaningfulDomainSignal: detectMeaningfulDomainSignal(item),
    actionableIntentDetected: detectActionableIntent(item),
    healthSelfManagement: detectHealthSelfManagement(item),
  };
}

export function derivePromotedBecause(
  item: LifeObject,
  signals: PromotionEligibilitySignals,
  confidence: Confidence,
): PromotedBecause | null {
  const label = timingLabel(item).toLowerCase();
  const isDeadlineLabel =
    label.startsWith('before ') ||
    (label.startsWith('by ') && !/^by \d/.test(label));

  if (item.parse.schedulingIntent) return 'scheduling_intent';
  if (signals.healthSelfManagement && signals.exactDayDetected) {
    return 'health_self_management';
  }
  if (
    signals.meaningfulDomainSignal &&
    confidence === 'high' &&
    signals.exactDayDetected &&
    signals.exactClockDetected
  ) {
    return 'exact_day_exact_clock';
  }
  if (signals.highConfidenceDayOnly && signals.meaningfulDomainSignal) {
    return isDeadlineLabel ? 'deadline_day' : 'high_confidence_day_only';
  }
  // Community-specific day promotion
  if (textSignalsCommunity(item.raw) && signals.exactDayDetected) {
    return 'community_signal';
  }
  // Sports registration on a named day
  if (
    /\b(registration|tryout|tryouts)\b/i.test(item.raw) &&
    LOGISTICS_SIGNALS.test(item.raw) &&
    signals.exactDayDetected
  ) {
    return 'sports_registration';
  }
  // Household child + activity signal
  if (
    item.parse.people.some((p) => p.confidence !== 'low' && isHouseholdChildPerson(p.value)) &&
    LOGISTICS_SIGNALS.test(item.raw)
  ) {
    return 'child_activity_signal';
  }
  // Action verb + named day path (no domain signal required)
  if (!signals.meaningfulDomainSignal && signals.exactDayDetected && signals.actionableIntentDetected) {
    return isDeadlineLabel ? 'deadline_day' : 'action_with_day';
  }
  if (ACTION_VERBS.test(item.raw)) return 'action_signal';
  if (LOGISTICS_SIGNALS.test(item.raw)) return 'logistics_signal';
  if (EVENT_WORK_SIGNALS.test(item.raw)) return 'event_work_signal';
  if (signals.actionableIntentDetected) return 'action_signal';
  return null;
}
