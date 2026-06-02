/**
 * Meridian — notification permission helpers
 *
 * Thin wrappers around expo-notifications permission APIs that map Expo's
 * status enum to Meridian's NotificationPermissionState union.
 *
 * Design:
 * - Never call requestPermissionsAsync automatically — only on explicit user action
 * - getPermissionsAsync is safe to call at any time (no user-visible side effects)
 * - Both helpers are async; callers must handle rejection (e.g. unavailable on web)
 */

import * as Notifications from 'expo-notifications';
import { PermissionStatus } from 'expo';
import { IosAuthorizationStatus } from 'expo-notifications';
import type { NotificationPermissionState } from '@/types/notificationDelivery';

/**
 * Maps an Expo PermissionResponse to Meridian's NotificationPermissionState.
 *
 * - 'granted'     — user has explicitly allowed notifications
 * - 'provisional' — iOS provisional (quiet delivery, no user-visible interruption)
 * - 'denied'      — user has explicitly denied; must direct to system settings
 * - 'unknown'     — not yet determined
 * - 'unavailable' — platform does not support notifications (web, simulator stub)
 */
export function mapExpoPermissionStatus(
  response: Notifications.NotificationPermissionsStatus,
): NotificationPermissionState {
  // Explicitly denied — cannot prompt again
  if (response.status === PermissionStatus.DENIED) {
    return 'denied';
  }

  // iOS provisional — notifications deliver quietly, no alert interruption
  if (response.ios?.status === IosAuthorizationStatus.PROVISIONAL) {
    return 'provisional';
  }

  // Fully granted
  if (response.granted || response.status === PermissionStatus.GRANTED) {
    return 'granted';
  }

  // Not yet determined
  if (response.status === PermissionStatus.UNDETERMINED) {
    return 'unknown';
  }

  return 'unavailable';
}

/**
 * Returns the current permission state without prompting the user.
 * Safe to call at any time — no user-visible side effects.
 */
export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  try {
    const response = await Notifications.getPermissionsAsync();
    return mapExpoPermissionStatus(response);
  } catch {
    // Web or environments where notifications are not available
    return 'unavailable';
  }
}

/**
 * Requests notification permissions from the user.
 *
 * IMPORTANT: Only call this in response to explicit user action (a Settings toggle).
 * Never call automatically on app launch or lifecycle events.
 *
 * On iOS, requests alert + badge + sound.
 * On Android 13+, the OS shows the system permission dialog.
 * Returns the resulting permission state.
 */
export async function requestNotificationPermissions(): Promise<NotificationPermissionState> {
  try {
    const response = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    return mapExpoPermissionStatus(response);
  } catch {
    return 'unavailable';
  }
}
