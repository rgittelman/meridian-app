/**
 * Calendar-aware adjustments to Focus orchestration (subtle, never shown as metrics).
 */

import type { MeridianCalendarEvent } from '@/types/calendar';
import type { OverloadAssessment, OverloadFactors } from './detectOverload';
import type { OverloadState } from '@/services/priority/types';
import { safeLower, safeTrim } from '@/utils/safeString';

const TWO_HOURS_MS = 2 * 3_600_000;
const FOUR_HOURS_MS = 4 * 3_600_000;

export type CalendarDaySignals = {
  familyTimingSoon: boolean;
  childPickupSoon: boolean;
  boardOrCommunitySoon: boolean;
  denseWorkAfternoon: boolean;
  openEvening: boolean;
  imminentCount: number;
};

export function analyzeCalendarDay(
  events: MeridianCalendarEvent[],
  now = Date.now(),
): CalendarDaySignals {
  const upcoming = events.filter((e) => e.endTime.getTime() > now);
  const within2h = upcoming.filter((e) => e.startTime.getTime() - now <= TWO_HOURS_MS);
  const within4h = upcoming.filter((e) => e.startTime.getTime() - now <= FOUR_HOURS_MS);

  const familyTimingSoon = within2h.some(
    (e) =>
      e.peopleImpact === 'HIGH' ||
      e.inferredCategory === 'family' ||
      e.timingSensitivity === 'high',
  );

  const childPickupSoon = within2h.some((e) =>
    safeLower(e?.displayLabel).includes('pickup'),
  );

  const boardOrCommunitySoon = within4h.some((e) => {
    const titleLower = safeLower(e?.title ?? e?.displayLabel);
    const calLower = safeLower(e?.sourceCalendarName);
    return (
      titleLower.includes('board') ||
      titleLower.includes('bfsc') ||
      calLower.includes('bfsc') ||
      e.attribution?.inferredDomain === 'community'
    );
  });

  const afternoonStart = new Date(now);
  afternoonStart.setHours(12, 0, 0, 0);
  const afternoonEnd = new Date(now);
  afternoonEnd.setHours(18, 0, 0, 0);

  const afternoonWork = upcoming.filter(
    (e) =>
      e.inferredCategory === 'work' &&
      e.startTime.getTime() >= afternoonStart.getTime() &&
      e.startTime.getTime() <= afternoonEnd.getTime(),
  );

  const denseWorkAfternoon = afternoonWork.length >= 3;

  const eveningStart = new Date(now);
  eveningStart.setHours(18, 0, 0, 0);
  const openEvening =
    upcoming.filter((e) => e.startTime.getTime() >= eveningStart.getTime()).length === 0;

  return {
    familyTimingSoon,
    childPickupSoon,
    boardOrCommunitySoon,
    denseWorkAfternoon,
    openEvening,
    imminentCount: within2h.length,
  };
}

function overloadStateFromScore(score: number): OverloadState {
  return score >= 7 ? 'HIGH' : score >= 4 ? 'MEDIUM' : 'LOW';
}

export function enrichOverloadWithCalendar(
  assessment: OverloadAssessment,
  calendarEvents: MeridianCalendarEvent[],
): OverloadAssessment {
  if (calendarEvents.length === 0) return assessment;

  const signals = analyzeCalendarDay(calendarEvents);
  let score = assessment._score;
  const factors: OverloadFactors = { ...assessment.factors };

  if (signals.childPickupSoon || signals.familyTimingSoon) {
    score += 1.5;
    factors.peopleStacking = true;
  }

  if (signals.denseWorkAfternoon) {
    score += 1.5;
    factors.timingCollision = true;
  }

  if (signals.boardOrCommunitySoon) {
    score += 0.75;
    factors.prepChainUnresolved = true;
  }

  if (signals.openEvening) {
    score = Math.max(0, score - 0.5);
  }

  const state = overloadStateFromScore(score);
  return { state, factors, _score: score };
}
