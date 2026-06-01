import type { MeridianCalendarEvent } from '@/types/calendar';
import type { PreparationWindow, PreparationWindowProfile } from '@/types/prep';
import { safeLower, safeTrim } from '@/utils/safeString';

type WindowSpec = {
  profile: PreparationWindowProfile;
  opensHoursBefore: number;
  closesHoursBefore: number;
};

const SPECS: Record<PreparationWindowProfile, WindowSpec> = {
  pickup: { profile: 'pickup', opensHoursBefore: 3, closesHoursBefore: 0 },
  sports: { profile: 'sports', opensHoursBefore: 12, closesHoursBefore: 0 },
  board: { profile: 'board', opensHoursBefore: 48, closesHoursBefore: 0 },
  work_prep: { profile: 'work_prep', opensHoursBefore: 72, closesHoursBefore: 0 },
  school: { profile: 'school', opensHoursBefore: 48, closesHoursBefore: 0 },
  travel: { profile: 'travel', opensHoursBefore: 14 * 24, closesHoursBefore: 0 },
  medical: { profile: 'medical', opensHoursBefore: 72, closesHoursBefore: 0 },
  community: { profile: 'community', opensHoursBefore: 72, closesHoursBefore: 0 },
  default: { profile: 'default', opensHoursBefore: 24, closesHoursBefore: 0 },
};

function inferWindowProfile(event: MeridianCalendarEvent): PreparationWindowProfile {
  const text = safeLower(
    [
      event.displayTitle,
      event.title,
      event.description,
      event.location,
      event.displaySourceLabel,
    ]
      .filter(Boolean)
      .join(' '),
  );
  const source = safeLower(event.sourceCalendarName);
  const domain = event.attribution?.inferredDomain ?? event.inferredLifeDomain;

  if (
    /\b(?:pick\s*up|pickup|drop\s*off|dropoff)\b/.test(text) ||
    (text.includes('pickup') && domain === 'family')
  ) {
    return 'pickup';
  }

  if (
    /\b(?:hockey|soccer|practice|game|tournament|volleyball|swim meet|football)\b/.test(
      text,
    ) ||
    source.includes('teamsnap')
  ) {
    return 'sports';
  }

  if (
    text.includes('board') ||
    source.includes('bfsc') ||
    text.includes('bfsc')
  ) {
    return 'board';
  }

  if (
    /\b(?:budget|presentation|qbr|review deck|slides)\b/.test(text) ||
    (domain === 'work' && /\b(?:review|prep|presentation)\b/.test(text))
  ) {
    return 'work_prep';
  }

  if (
    /\b(?:doctor|dentist|therapy|medical|checkup|appointment)\b/.test(text) ||
    domain === 'health'
  ) {
    return 'medical';
  }

  if (
    /\b(?:vacation|travel|trip|resort|flight|hotel)\b/.test(text) &&
    domain === 'family'
  ) {
    return 'travel';
  }

  if (
    source.includes('school') ||
    source.includes('rcs') ||
    /\b(?:school|classroom|conference|pta|field trip)\b/.test(text)
  ) {
    return 'school';
  }

  if (domain === 'community') return 'community';

  return 'default';
}

export function hoursUntilEventStart(event: MeridianCalendarEvent, now = Date.now()): number {
  return (event.startTime.getTime() - now) / 3_600_000;
}

export function buildPreparationWindow(
  event: MeridianCalendarEvent,
  now = Date.now(),
): PreparationWindow {
  const profile = inferWindowProfile(event);
  const spec = SPECS[profile];
  const hoursUntilStart = hoursUntilEventStart(event, now);

  const isActive =
    hoursUntilStart >= spec.closesHoursBefore &&
    hoursUntilStart <= spec.opensHoursBefore;

  return {
    profile: spec.profile,
    opensHoursBefore: spec.opensHoursBefore,
    closesHoursBefore: spec.closesHoursBefore,
    isActive,
    hoursUntilStart,
  };
}

export function windowOpensInLabel(window: PreparationWindow): string | null {
  if (window.isActive) return null;
  const hoursUntilOpen = window.hoursUntilStart - window.opensHoursBefore;
  if (hoursUntilOpen <= 0) return null;

  if (hoursUntilOpen < 24) {
    return 'Prep window opens later today';
  }
  if (hoursUntilOpen < 48) {
    return 'Prep window opens tomorrow';
  }
  const days = Math.ceil(hoursUntilOpen / 24);
  return `Prep window opens in ${days} days`;
}

export function eventTimingHeadline(event: MeridianCalendarEvent, now = Date.now()): string {
  const hours = hoursUntilEventStart(event, now);
  const title = safeTrim(event.displayTitle ?? event.title, 'Upcoming');

  if (hours < 1 && hours >= 0) return `${title} soon.`;
  if (hours < 0) return `${title} underway.`;
  if (hours < 4) return `${title} in a few hours.`;
  if (hours < 24) return `${title} later today.`;
  if (hours < 48) return `${title} tomorrow.`;
  return `${title} ahead.`;
}
