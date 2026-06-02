/**
 * Meridian — notification tap handler
 *
 * Converts a NotificationTapDestination into a navigation action.
 *
 * V1 routing (Phase D):
 *   focus               → Focus tab
 *   plan                → Plan tab
 *   event_detail        → Plan tab   (event detail screen deferred)
 *   capture_detail      → Capture tab (capture detail screen deferred)
 *   unknown / missing   → Focus tab
 *
 * If navigation is not ready when a tap fires, the destination is queued
 * and flushed by flushPendingNotificationTap() once the navigator mounts.
 */

import type { NotificationTapDestination } from '@/types/notificationDelivery';
import { TAB_ROUTES } from '@/constants/tabs';

// ── Tab mapping ───────────────────────────────────────────────────────────────

export type TapTabTarget = 'Focus' | 'Plan' | 'Capture';

/**
 * Pure mapping from NotificationTapDestination to a tab name.
 * Testable without navigation or React.
 */
export function tapDestinationToTab(destination: NotificationTapDestination): TapTabTarget {
  switch (destination.screen) {
    case 'focus':
      return TAB_ROUTES.Focus;
    case 'plan':
      return TAB_ROUTES.Plan;
    case 'event_detail':
      // Event detail screen does not exist yet — route to Plan for context.
      return TAB_ROUTES.Plan;
    case 'capture_detail':
      // Capture detail screen does not exist yet — route to Capture tab.
      return TAB_ROUTES.Capture;
    default:
      return TAB_ROUTES.Focus;
  }
}

// ── Pending tap queue ─────────────────────────────────────────────────────────

let pendingTapDestination: NotificationTapDestination | null = null;

/**
 * Tracks the last notification identifier we acted on.
 * Prevents double-routing when getLastNotificationResponseAsync and the
 * response listener both fire for the same notification (e.g. on some
 * Android versions after a fast background → foreground cycle).
 */
let lastHandledNotificationId: string | null = null;

/**
 * Attempt to navigate to `destination`.
 * If the navigator is not ready, stores the destination for later flush.
 * Must be called with the navigationRef from @/navigation/navigationRef.
 *
 * Pass `notificationId` to deduplicate against the last-handled response.
 */
export function handleNotificationTap(
  destination: NotificationTapDestination,
  nav: { isReady: () => boolean; navigate: (name: string, params?: object) => void },
  notificationId?: string,
): void {
  if (notificationId !== undefined) {
    if (lastHandledNotificationId === notificationId) return;
    lastHandledNotificationId = notificationId;
  }
  if (!nav.isReady()) {
    pendingTapDestination = destination;
    return;
  }
  const tab = tapDestinationToTab(destination);
  nav.navigate(tab);
}

/**
 * Called once after NavigationContainer reports ready.
 * Flushes any tap that arrived before navigation was mounted.
 */
export function flushPendingNotificationTap(
  nav: { isReady: () => boolean; navigate: (name: string, params?: object) => void },
): void {
  if (!pendingTapDestination) return;
  if (!nav.isReady()) return;
  const tab = tapDestinationToTab(pendingTapDestination);
  pendingTapDestination = null;
  nav.navigate(tab);
}

// ── Notification data guard ───────────────────────────────────────────────────

type NotificationData = Record<string, unknown>;

/**
 * Returns the tap destination from notification data if this is a
 * Meridian-managed notification, or null if it should be ignored.
 */
export function extractTapDestination(data: NotificationData): NotificationTapDestination | null {
  if (!data || data['meridianManaged'] !== true) return null;

  const raw = data['tapDestination'];
  if (!raw || typeof raw !== 'object') return null;

  const dest = raw as Record<string, unknown>;
  const screen = dest['screen'];

  if (screen === 'focus') return { screen: 'focus' };
  if (screen === 'plan') return { screen: 'plan' };
  if (screen === 'event_detail' && typeof dest['eventId'] === 'string') {
    return { screen: 'event_detail', eventId: dest['eventId'] };
  }
  if (screen === 'capture_detail' && typeof dest['captureId'] === 'string') {
    return { screen: 'capture_detail', captureId: dest['captureId'] };
  }

  // Unrecognised destination — fall back to Focus.
  return { screen: 'focus' };
}
