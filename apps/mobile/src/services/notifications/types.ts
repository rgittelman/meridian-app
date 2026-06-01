import type { NotificationDailyCaps } from '@/types/notification';

/** Runtime context for suppression, caps, and constitutional checks. */
export type NotificationIntelligenceContext = {
  lastAppOpenedAt: number | null;
  /** bundleKey → last surfaced timestamp */
  recentAwarenessAt: Record<string, number>;
  /** bundleKey → user ignored timestamp */
  ignoredPatterns: Record<string, number>;
  recoveryWindowUntil: number | null;
  overloadRecoveryActive: boolean;
  dailyCaps: NotificationDailyCaps;
};
