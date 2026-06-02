import type {
  NotificationBundle,
  NotificationCandidateType,
  NotificationDailyCaps,
} from '@/types/notification';
import { compareByInterruptionScore } from './interruptionScore';

function capForType(
  type: NotificationCandidateType,
  caps: NotificationDailyCaps,
): number | null {
  switch (type) {
    case 'morning_brief':
      return caps.morningBrief;
    case 'evening_wind_down':
      return caps.eveningWindDown;
    case 'transition_awareness':
      return caps.transitionAwareness;
    case 'critical_commitment_protection':
      return caps.criticalProtectionExempt ? null : 1;
    case 'leave_alert':
      return caps.leaveAlert;
    case 'capture_reminder':
      return caps.captureReminder;
    default:
      return 1;
  }
}

export type DailyCapResult = {
  approved: NotificationBundle[];
  capped: NotificationBundle[];
};

/**
 * Enforce daily caps — actively resist notification creep.
 */
export function applyDailyCaps(
  bundles: NotificationBundle[],
  caps: NotificationDailyCaps,
): DailyCapResult {
  const sorted = [...bundles].sort(compareByInterruptionScore);
  const counts: Partial<Record<NotificationCandidateType, number>> = {};
  const approved: NotificationBundle[] = [];
  const capped: NotificationBundle[] = [];

  for (const bundle of sorted) {
    const limit = capForType(bundle.type, caps);
    if (limit === null) {
      approved.push(bundle);
      continue;
    }

    const used = counts[bundle.type] ?? 0;
    if (used < limit) {
      counts[bundle.type] = used + 1;
      approved.push(bundle);
    } else {
      capped.push({
        ...bundle,
        decision: 'suppress',
        suppressionReason: 'daily_cap_reached',
      });
    }
  }

  return { approved, capped };
}
