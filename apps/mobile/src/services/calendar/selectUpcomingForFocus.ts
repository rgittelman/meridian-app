import type { MeridianCalendarEvent } from '@/types/calendar';
import { memberByName } from '@/services/relevance/householdContext';
import { filterEventsForFocus } from './eventFilters';

const FOCUS_UPCOMING_MIN = 2;
const FOCUS_UPCOMING_MAX = 4;
const FOCUS_UPCOMING_EVENING_MAX = 5;
const EVENING_LOOKAHEAD_HOURS = 96;
const MAX_CONSECUTIVE_WORK = 2;

function msUntilStart(event: MeridianCalendarEvent, now: number): number {
  return Math.max(0, event.startTime.getTime() - now);
}

function isChildFamilyEvent(event: MeridianCalendarEvent): boolean {
  const person = event.displayPersonLabel ?? event.attribution?.ownerDisplayName;
  if (person && memberByName(person)?.role === 'child') return true;
  const title = `${event.rawTitle ?? event.title} ${event.displayTitle}`;
  return /\b(?:hudson|quinn|grace|reagan)\b/i.test(title);
}

function isHockeyOrChildSports(event: MeridianCalendarEvent): boolean {
  const blob = `${event.rawTitle ?? ''} ${event.title} ${event.displayTitle ?? ''}`;
  return /\bhockey\b/i.test(blob) || /\b(?:hudson|quinn)\b/i.test(blob);
}

function scoreEvent(event: MeridianCalendarEvent, now: number): number {
  const until = msUntilStart(event, now);
  const hoursUntil = until / 3_600_000;
  const currentHour = new Date(now).getHours();
  const isEvening = currentHour >= 18;
  const horizonHours = isEvening ? EVENING_LOOKAHEAD_HOURS : 72;

  let score = 1000 - Math.min(hoursUntil, horizonHours) * (isEvening ? 9 : 12);

  if (event.peopleImpact === 'HIGH') score += 80;
  if (event.timingSensitivity === 'high') score += 60;
  if (event.timingSensitivity === 'medium') score += 20;
  if (event.inferredCategory === 'family') score += 40;
  if (event.confidence === 'high') score += 15;
  if (event.confidence === 'low') score -= 25;

  if (event.inferredCategory === 'work') score -= 5;

  if (isEvening) {
    if (event.inferredCategory === 'family') score += 45;
    if (isChildFamilyEvent(event)) score += 55;
    if (isHockeyOrChildSports(event)) score += 70;
    if (hoursUntil > 36 && hoursUntil <= EVENING_LOOKAHEAD_HOURS) score += 50;
    if (hoursUntil > 36) score -= 4;
  } else if (hoursUntil > 36) {
    score -= 30;
  }

  return score;
}

/**
 * Selects 2–5 upcoming events for Focus "Coming up".
 * Evening mode looks up to 96h ahead for child/family logistics.
 */
export function selectUpcomingForFocus(
  events: MeridianCalendarEvent[],
  now = Date.now(),
  max?: number,
): MeridianCalendarEvent[] {
  const currentHour = new Date(now).getHours();
  const cap =
    max ??
    (currentHour >= 18 ? FOCUS_UPCOMING_EVENING_MAX : FOCUS_UPCOMING_MAX);

  const candidates = filterEventsForFocus(events)
    .filter((e) => e.endTime.getTime() >= now)
    .map((e) => ({ event: e, score: scoreEvent(e, now) }))
    .sort((a, b) => b.score - a.score);

  const selected: MeridianCalendarEvent[] = [];
  let consecutiveWork = 0;

  for (const { event } of candidates) {
    if (selected.length >= cap) break;

    const isWork = event.inferredCategory === 'work';
    if (isWork && consecutiveWork >= MAX_CONSECUTIVE_WORK) continue;

    selected.push(event);
    consecutiveWork = isWork ? consecutiveWork + 1 : 0;
  }

  if (selected.length < FOCUS_UPCOMING_MIN) {
    for (const { event } of candidates) {
      if (selected.length >= FOCUS_UPCOMING_MIN) break;
      if (!selected.some((s) => s.id === event.id)) selected.push(event);
    }
  }

  return selected
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    .slice(0, cap);
}
