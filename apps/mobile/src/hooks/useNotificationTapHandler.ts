/**
 * Meridian — useNotificationTapHandler
 *
 * Phase D: wires expo-notifications response listener to the navigation handler.
 *
 * Responsibilities:
 * - Check getLastNotificationResponseAsync on mount (cold-launch path)
 * - Listen for notification taps (addNotificationResponseReceivedListener)
 * - Ignore non-Meridian notifications via extractTapDestination
 * - Navigate to the correct tab via navigationRef
 *
 * Cold launch:
 *   addNotificationResponseReceivedListener does NOT replay the tap that
 *   launched the app from a terminated state. That response must be read
 *   explicitly via getLastNotificationResponseAsync() on startup. Both paths
 *   share the same extractTapDestination → handleNotificationTap flow, and
 *   the notification identifier deduplication guard in handleNotificationTap
 *   prevents double-routing if both fire for the same response.
 *
 * Foreground received:
 *   setNotificationHandler suppresses banners — user is already in the app.
 *
 * Navigation readiness:
 *   handleNotificationTap queues the destination if navigation is not ready.
 *   RootNavigator's onReady callback flushes the queue.
 */

import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';

import { navigationRef } from '@/navigation/navigationRef';
import {
  extractTapDestination,
  flushPendingNotificationTap,
  handleNotificationTap,
} from '@/services/notifications/handleNotificationTap';

// Suppress foreground notification banners — the user is already in the app.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});

export function useNotificationTapHandler(): void {
  useEffect(() => {
    // ── Cold-launch path ────────────────────────────────────────────────────
    // The response listener never replays a tap that launched the app from a
    // terminated state. Read it once here via getLastNotificationResponseAsync.
    // handleNotificationTap queues the destination; RootNavigator.onReady flushes it.
    void (async () => {
      const lastResponse = await Notifications.getLastNotificationResponseAsync();
      if (!lastResponse) return;
      const data = lastResponse.notification.request.content.data as Record<string, unknown>;
      const destination = extractTapDestination(data);
      if (!destination) return;
      if (__DEV__) {
        console.log('[NotificationTap] cold-launch routing to', destination.screen);
      }
      handleNotificationTap(
        destination,
        navigationRef,
        lastResponse.notification.request.identifier,
      );
    })();

    // Flush in case navigation was already ready before the async call above
    // resolves (e.g. fast device where fonts loaded before getLastNotification
    // returned).  If pendingTapDestination is still null at this point this
    // is a no-op; if it was set synchronously it routes immediately.
    flushPendingNotificationTap(navigationRef);

    // ── Background / foreground listener path ───────────────────────────────
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      const destination = extractTapDestination(data);
      if (!destination) {
        if (__DEV__) {
          console.log('[NotificationTap] ignored — non-Meridian notification');
        }
        return;
      }
      if (__DEV__) {
        console.log('[NotificationTap] routing to', destination.screen);
      }
      handleNotificationTap(
        destination,
        navigationRef,
        response.notification.request.identifier,
      );
    });

    return () => sub.remove();
  }, []);
}
