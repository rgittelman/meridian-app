import type { NotificationCandidateType } from '@/types/notification';
import type { NotificationSettingsState } from '@/store/notificationSettingsStore';

type RelevantSettings = Pick<
  NotificationSettingsState,
  | 'morningBriefEnabled'
  | 'eveningPreviewEnabled'
  | 'beforeEventsEnabled'
  | 'criticalAlertsEnabled'
>;

/**
 * Returns true when the bundle type is permitted by the user's category settings.
 * Unknown future types default to allowed so new types are not silently suppressed
 * before a settings toggle is wired up.
 */
export function shouldDeliverBundleForSettings(
  type: NotificationCandidateType,
  settings: RelevantSettings,
): boolean {
  switch (type) {
    case 'morning_brief':
      return settings.morningBriefEnabled;
    case 'evening_wind_down':
      return settings.eveningPreviewEnabled;
    case 'transition_awareness':
      return settings.beforeEventsEnabled;
    case 'critical_commitment_protection':
      return settings.criticalAlertsEnabled;
    default:
      return true;
  }
}
