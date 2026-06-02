/**
 * Meridian — useNotificationTapHandler
 *
 * Phase D: wires expo-notifications response listener to the navigation handler.
 *
 * Responsibilities:
 * - Listen for notification taps (addNotificationResponseReceivedListener)
 * - Ignore non-Meridian notifications
 * - Extract tapDestination from notification data
 * - Navigate to the correct tab via navigationRef
 *
 * Foreground received:
 * - No custom UI — Expo's default behavior applies (banner if OS allows)
 * - setNotificationHandler is configured to not show foreground alerts to
 *   avoid double-interruption while the user is already in the app.
 *
 * Navigation readiness:
 * - Uses flushPendingNotificationTap on mount in case the app launched cold
 *   from a notification tap before the navigator was ready.
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
    // Flush any tap that arrived before navigation mounted (cold launch from tap).
    flushPendingNotificationTap(navigationRef);

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
      handleNotificationTap(destination, navigationRef);
    });

    return () => sub.remove();
  }, []);
}
