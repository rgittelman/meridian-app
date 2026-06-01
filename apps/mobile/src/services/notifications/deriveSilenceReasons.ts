import type { MeridianCalendarEvent } from '@/types/calendar';
import type { LifeObject } from '@/types/capture';
import type { PrepCluster } from '@/types/prep';
import { filterEventsForPlan } from '@/services/calendar/eventFilters';
import { isHouseholdRelevant } from '@/services/relevance';
import { enrichEventsWithCaptureRelationships } from '@/services/relationships/calendarCaptureIndex';
import { buildPrepIntelligence } from '@/services/prep/buildPrepIntelligence';
import { detectScheduleConflicts } from './detectScheduleConflicts';
import {
  EVENING_WIND_DOWN_WINDOW,
  MORNING_BRIEF_WINDOW,
  RECENTLY_OPENED_APP_MS,
  RECOVERY_WINDOW_MS,
} from './constants';
import { isWithinLocalHourWindow } from './candidateHelpers';
import type { NotificationIntelligenceContext } from './types';
import type { NotificationPipelineDiagnostics } from './buildNotificationIntelligence';
import { suppressionReasonLabel } from './verificationLabels';

import type { NotificationSystemStatus } from '@/types/notification';

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function tomorrowHouseholdCount(events: MeridianCalendarEvent[], now: Date): number {
  const tomorrow = new Date(startOfDay(now));
  tomorrow.setDate(tomorrow.getDate() + 1);
  const key = startOfDay(tomorrow).toISOString();
  return events.filter(
    (e) =>
      startOfDay(e.startTime).toISOString() === key &&
      e.signalClassification === 'meaningful' &&
      isHouseholdRelevant(e),
  ).length;
}

function todayTomorrowHouseholdCount(events: MeridianCalendarEvent[], now: Date): number {
  const today = startOfDay(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const keys = new Set([today.toISOString(), startOfDay(tomorrow).toISOString()]);
  return events.filter(
    (e) =>
      keys.has(startOfDay(e.startTime).toISOString()) &&
      e.signalClassification === 'meaningful' &&
      isHouseholdRelevant(e),
  ).length;
}

function activePrepWindowCount(clusters: PrepCluster[]): number {
  return clusters.filter((c) => c.window.isActive && isHouseholdRelevant(c.event)).length;
}

/**
 * Explains why Meridian earned silence — verification should prove intelligence, not inactivity.
 */
export function deriveNotificationSilenceReasons(input: {
  events: MeridianCalendarEvent[];
  captures: LifeObject[];
  context: NotificationIntelligenceContext;
  diagnostics: NotificationPipelineDiagnostics;
  approvedCount: number;
  now?: Date;
}): string[] {
  const now = input.now ?? new Date();
  const reasons: string[] = [];
  const { context: ctx, diagnostics } = input;

  const planEvents = filterEventsForPlan(input.events);
  const conflicts = detectScheduleConflicts(input.events, now.getTime());
  const { index } = enrichEventsWithCaptureRelationships(input.events, input.captures);
  const prepClusters = buildPrepIntelligence(input.events, index, now.getTime()).clusters;
  const activePrep = activePrepWindowCount(prepClusters);

  const inMorningWindow = isWithinLocalHourWindow(
    now,
    MORNING_BRIEF_WINDOW.startHour,
    MORNING_BRIEF_WINDOW.endHour,
  );
  const inEveningWindow = isWithinLocalHourWindow(
    now,
    EVENING_WIND_DOWN_WINDOW.startHour,
    EVENING_WIND_DOWN_WINDOW.endHour,
  );

  if (diagnostics.rawGenerated.length === 0) {
    if (!inMorningWindow && !inEveningWindow) {
      reasons.push(
        'Outside morning and evening delivery windows — transition awareness only surfaces inside actionable prep windows.',
      );
    }

    if (activePrep === 0) {
      reasons.push('No active prep windows for household commitments right now.');
    } else {
      reasons.push(
        `${activePrep} prep window${activePrep === 1 ? '' : 's'} open — none met surfacing rules for transition awareness.`,
      );
    }

    if (conflicts.length === 0) {
      reasons.push('No schedule conflicts detected among household commitments.');
    }

    if (todayTomorrowHouseholdCount(planEvents, now) === 0) {
      reasons.push('No household-impact commitments on the calendar for today or tomorrow.');
    } else if (!inMorningWindow) {
      reasons.push(
        `${todayTomorrowHouseholdCount(planEvents, now)} household commitment(s) ahead — not in the morning brief window.`,
      );
    }

    if (inEveningWindow && tomorrowHouseholdCount(planEvents, now) === 0) {
      reasons.push('Evening wind-down only surfaces when tomorrow has household-relevant commitments.');
    }

    if (planEvents.length === 0) {
      reasons.push('No household-relevant calendar events in the current plan window.');
    }
  } else {
    reasons.push(
      `${diagnostics.rawGenerated.length} candidate(s) generated for the current moment.`,
    );
  }

  if (
    ctx.lastAppOpenedAt &&
    now.getTime() - ctx.lastAppOpenedAt < RECENTLY_OPENED_APP_MS
  ) {
    reasons.push('User already aware through recent app usage — recently opened app.');
  }

  if (ctx.recoveryWindowUntil && now.getTime() < ctx.recoveryWindowUntil) {
    reasons.push('Inside recovery window — preferring silence.');
  }

  if (ctx.overloadRecoveryActive) {
    reasons.push('Overload recovery active — non-critical notifications withheld.');
  }

  const suppressedByReason = new Map<string, number>();
  for (const [, reason] of diagnostics.engineSuppressedById) {
    const label = suppressionReasonLabel(reason);
    suppressedByReason.set(label, (suppressedByReason.get(label) ?? 0) + 1);
  }

  for (const [label, count] of suppressedByReason) {
    reasons.push(
      `${count} candidate${count === 1 ? '' : 's'} suppressed: ${label}.`,
    );
  }

  const constitutionalFails = Object.values(diagnostics.constitutionalChecks).filter(
    (c) => !c.pass,
  ).length;
  if (constitutionalFails > 0) {
    reasons.push(
      `${constitutionalFails} candidate${constitutionalFails === 1 ? '' : 's'} failed constitutional check.`,
    );
  }

  if (diagnostics.cappedBundleIds.size > 0) {
    reasons.push('Daily caps reached for one or more notification types.');
  }

  if (diagnostics.rawGenerated.length > 0 && input.approvedCount === 0) {
    reasons.push('Silence preferred — nothing earned delivery after suppression and caps.');
  }

  if (reasons.length === 0) {
    reasons.push('Silence preferred — no interruption value above threshold.');
  }

  return [...new Set(reasons)];
}

export function deriveNotificationSystemStatus(
  rawGenerated: number,
  approvedCount: number,
): NotificationSystemStatus {
  if (approvedCount > 0) return 'would_send';
  if (rawGenerated > 0) return 'candidates_suppressed';
  return 'silent';
}
