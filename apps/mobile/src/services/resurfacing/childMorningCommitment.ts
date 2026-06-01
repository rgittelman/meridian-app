import type { LifeObject } from '@/types/capture';
import type { MeridianCalendarEvent } from '@/types/calendar';
import {
  HOUSEHOLD_CHILDREN,
  memberByName,
} from '@/services/relevance/householdContext';

const EARLY_AM_PATTERN =
  /\b(?:at\s+)?([1-9]|1[0-1])(?::\d{2})?\s*am\b/i;

const CHILD_COMMITMENT_HINTS =
  /\b(?:training|practice|lesson|class|game|meet|drop[- ]?off|pick[- ]?up|lifeguard|school|camp)\b/i;

function referencesChild(obj: LifeObject): boolean {
  if (obj.parse.people.some((p) => memberByName(p.value)?.role === 'child')) {
    return true;
  }
  const haystack = `${obj.raw} ${obj.title}`;
  return HOUSEHOLD_CHILDREN.some((c) =>
    new RegExp(`\\b${c.name}\\b`, 'i').test(haystack),
  );
}

function timingIsTomorrowMorning(label: string): boolean {
  const lower = label.toLowerCase();
  if (!lower.includes('tomorrow')) return false;
  return EARLY_AM_PATTERN.test(lower) || /\bmorning\b/.test(lower);
}

function eventIsTomorrowMorning(
  event: MeridianCalendarEvent,
  now = Date.now(),
): boolean {
  const hoursUntil = (event.startTime.getTime() - now) / 3_600_000;
  if (hoursUntil < 0 || hoursUntil > 18) return false;

  const startHour = event.startTime.getHours();
  return startHour < 11;
}

/**
 * Child logistics due early tomorrow (e.g. Grace lifeguard 6:45am) should prep
 * the evening before — opens around 9pm the night prior.
 */
export function isChildMorningCommitment(
  obj: LifeObject,
  linkedEvent?: MeridianCalendarEvent,
  now = Date.now(),
): boolean {
  if (!referencesChild(obj)) return false;

  const timingLabel = obj.parse.timing?.value.label ?? '';
  const textSuggestsCommitment =
    CHILD_COMMITMENT_HINTS.test(obj.raw) ||
    CHILD_COMMITMENT_HINTS.test(obj.title);

  if (timingIsTomorrowMorning(timingLabel) && textSuggestsCommitment) {
    return true;
  }

  if (linkedEvent && eventIsTomorrowMorning(linkedEvent, now)) {
    return referencesChild(obj) || obj.parse.category?.value === 'family';
  }

  if (
    obj.parse.timing?.value.label.toLowerCase().includes('tomorrow') &&
    EARLY_AM_PATTERN.test(obj.raw) &&
    referencesChild(obj)
  ) {
    return true;
  }

  return false;
}
