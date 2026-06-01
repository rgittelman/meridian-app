import type { NotificationDailyCaps } from '@/types/notification';

/** Default safeguards — system actively resists notification creep. */
export const DEFAULT_NOTIFICATION_DAILY_CAPS: NotificationDailyCaps = {
  morningBrief: 1,
  eveningWindDown: 1,
  transitionAwareness: 2,
  criticalProtectionExempt: true,
};

/** Local hour windows (0–23) for candidate generation. */
export const MORNING_BRIEF_WINDOW = { startHour: 6, endHour: 9 } as const;
export const EVENING_WIND_DOWN_WINDOW = { startHour: 19, endHour: 21 } as const;

/** User opened app within this window → suppress low-value nudges. */
export const RECENTLY_OPENED_APP_MS = 2 * 60 * 60 * 1000;

/** Recovery / decompression — prefer silence. */
export const RECOVERY_WINDOW_MS = 4 * 60 * 60 * 1000;

/** Ignore pattern cooldown after user dismisses awareness. */
export const IGNORED_PATTERN_COOLDOWN_MS = 48 * 60 * 60 * 1000;

/** Duplicate awareness: same bundle key surfaced recently. */
export const DUPLICATE_AWARENESS_COOLDOWN_MS = 20 * 60 * 60 * 1000;

/** Minimum interruption score to remain eligible (0–100 internal). */
export const MIN_INTERRUPTION_SCORE = 28;

/** Minimum confidence rank for surfacing (low=1, medium=2, high=3). */
export const MIN_CONFIDENCE_RANK = 2;
