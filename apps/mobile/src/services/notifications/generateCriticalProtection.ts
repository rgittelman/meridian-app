import { detectScheduleConflicts } from './detectScheduleConflicts';
import {
  buildCandidate,
  dayKey,
  eventPrimaryLine,
  windowForLocalHours,
} from './candidateHelpers';
import type { NotificationCandidate } from '@/types/notification';
import type { MeridianCalendarEvent } from '@/types/calendar';
import type { NotificationGeneratorOptions } from './generatorOptions';

/**
 * Critical commitment protection — highest priority; real conflicts only.
 */
export function generateCriticalProtectionCandidates(
  events: MeridianCalendarEvent[],
  now = new Date(),
  _options?: NotificationGeneratorOptions,
): NotificationCandidate[] {
  const conflicts = detectScheduleConflicts(events, now.getTime());
  const { start, end } = windowForLocalHours(now, 6, 23);

  return conflicts.map((conflict) => {
    const primary = eventPrimaryLine(conflict.eventA);
    return buildCandidate({
      id: `critical-${conflict.id}`,
      type: 'critical_commitment_protection',
      event: conflict.eventA,
      generatedAt: now,
      windowStart: start,
      windowEnd: end,
      confidence: 'high',
      interruptionReason: 'Prevent a real scheduling problem.',
      bundleKey: `critical-${dayKey(now)}`,
      primaryLine: primary,
      secondaryLine: conflict.description,
      additionalLines: [eventPrimaryLine(conflict.eventB)],
      conflictRisk: 1,
      householdImpact: 'high',
      timingSensitivity: 'high',
    });
  });
}
