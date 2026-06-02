/**
 * DEV ONLY — Notification delivery + tap routing smoke test.
 *
 * Renders destination-specific send buttons plus a cancel button.
 * Covers all V1 tap destinations for Phase D manual verification.
 *
 * This component must ONLY be rendered when __DEV__ is true.
 * Remove this file and its import in CaptureScreen.tsx after verifying delivery.
 *
 * HOW TO TEST (Phase D)
 * ─────────────────────
 * 1. Run `npx expo run:ios` (native build required for expo-notifications).
 * 2. Open the Capture tab — the smoke test panel is at the bottom.
 * 3. Grant permission when prompted (first send only).
 * 4. For each destination button:
 *    a. Tap the button — note the status line confirming the fire time.
 *    b. Background the app (Home / swipe up).
 *    c. Wait ~15 seconds for the notification to arrive.
 *    d. Tap the notification banner.
 *    e. Verify the app opens to the expected tab (see table below).
 *    f. Tap "Cancel All" before scheduling the next destination.
 *
 *  Button                     | Expected tab on tap
 *  ─────────────────────────  | ──────────────────
 *  Focus Test                 | Focus
 *  Plan Test                  | Plan
 *  Capture Test               | Capture
 *  Non-Meridian Test          | No Meridian routing (system default)
 *
 * COLD LAUNCH TEST
 * ─────────────────
 * 1. Tap a destination button and note it is scheduled.
 * 2. Force-quit the app (swipe up from app switcher).
 * 3. Tap the notification banner when it arrives.
 * 4. Verify the app launches and routes to the correct tab.
 *
 * FOREGROUND TEST
 * ───────────────
 * 1. Schedule any notification.
 * 2. Keep the app open.
 * 3. Wait for it to fire — confirm no crash and no banner (foreground suppressed).
 */

import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as ExpoNotifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { nanoid } from 'nanoid/non-secure';

import { Text } from '@/components/typography/Text';
import { requestNotificationPermissions } from '@/services/notifications/delivery';
import { useNotificationDeliveryStore } from '@/store/notificationDeliveryStore';
import { makeStyles, radius, spacing } from '@/theme';

const DELAY_SECONDS = 15;

// ── Platform notification IDs tracked for cancellation ───────────────────────

type ScheduledIds = { platformId: string; label: string }[];

// ── Per-destination schedule helpers ─────────────────────────────────────────

async function scheduleRaw(opts: {
  label: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  delaySeconds?: number;
}): Promise<string> {
  const delay = opts.delaySeconds ?? DELAY_SECONDS;
  const fireAt = new Date(Date.now() + delay * 1000);
  return ExpoNotifications.scheduleNotificationAsync({
    content: {
      title: opts.title,
      body: opts.body,
      data: opts.data,
      sound: 'default',
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DATE,
      date: fireAt,
    },
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export function NotificationSmokeTest() {
  const styles = useStyles();
  const [status, setStatus] = useState<string>('');
  const scheduledIds = useRef<ScheduledIds>([]);
  const setPermissionState = useNotificationDeliveryStore((s) => s.setPermissionState);

  const ensurePermission = async (): Promise<boolean> => {
    setStatus('Requesting permission…');
    const permission = await requestNotificationPermissions();
    setPermissionState(permission);
    if (permission !== 'granted' && permission !== 'provisional') {
      setStatus(`Permission: ${permission}. Enable notifications in iOS Settings.`);
      return false;
    }
    return true;
  };

  const send = async (
    label: string,
    title: string,
    body: string,
    data: Record<string, unknown>,
  ) => {
    if (!(await ensurePermission())) return;
    setStatus(`Scheduling ${label}…`);
    try {
      const platformId = await scheduleRaw({ label, title, body, data });
      scheduledIds.current = [...scheduledIds.current, { platformId, label }];
      setStatus(`${label} scheduled ✓ — fires in ~${DELAY_SECONDS}s. Background app to receive.`);
    } catch (e) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleFocus = () =>
    send(
      'Focus Test',
      'Meridian · Focus',
      'Tap to open Focus.',
      {
        meridianManaged: true,
        bundleKey: 'smoke-test-focus',
        tapDestination: { screen: 'focus' },
      },
    );

  const handlePlan = () =>
    send(
      'Plan Test',
      'Meridian · Plan',
      'Tap to open Plan.',
      {
        meridianManaged: true,
        bundleKey: 'smoke-test-plan',
        tapDestination: { screen: 'plan' },
      },
    );

  const handleCapture = () =>
    send(
      'Capture Test',
      'Meridian · Capture',
      'Tap to open Capture.',
      {
        meridianManaged: true,
        bundleKey: 'smoke-test-capture',
        tapDestination: { screen: 'capture_detail', captureId: 'smoke-cap-001' },
      },
    );

  const handleLeaveAlert = () =>
    send(
      'Leave Alert Test',
      'Meridian',
      "Grace's volleyball practice starts in 30 minutes.",
      {
        meridianManaged: true,
        bundleKey: 'smoke-test-leave-alert',
        tapDestination: { screen: 'plan' },
      },
    );

  const handleNonMeridian = () =>
    send(
      'Non-Meridian Test',
      'External notification',
      'This should not trigger Meridian routing.',
      {
        // No meridianManaged key — simulates a third-party notification
        someOtherKey: nanoid(),
      },
    );

  const handleCancelAll = async () => {
    const ids = scheduledIds.current;
    if (ids.length === 0) {
      setStatus('Nothing scheduled.');
      return;
    }
    await Promise.allSettled(
      ids.map(({ platformId }) =>
        ExpoNotifications.cancelScheduledNotificationAsync(platformId),
      ),
    );
    scheduledIds.current = [];
    setStatus('All test notifications cancelled.');
  };

  return (
    <View style={styles.wrap}>
      <Text variant="caption" color="inkGhost" style={styles.label}>
        Notification tap routing (dev · Phase D)
      </Text>

      <View style={styles.grid}>
        <SmokeButton label="Focus Test" onPress={handleFocus} />
        <SmokeButton label="Plan Test" onPress={handlePlan} />
        <SmokeButton label="Capture Test" onPress={handleCapture} />
        <SmokeButton label="Leave Alert Test" onPress={handleLeaveAlert} />
        <SmokeButton label="Non-Meridian Test" onPress={handleNonMeridian} dim />
      </View>

      <Pressable
        onPress={handleCancelAll}
        style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Cancel all test notifications"
      >
        <Text variant="caption" color="inkSecondary">
          Cancel All Test Notifications
        </Text>
      </Pressable>

      {status ? (
        <Text variant="caption" color="inkGhost" style={styles.status}>
          {status}
        </Text>
      ) : null}
    </View>
  );
}

// ── Sub-component ─────────────────────────────────────────────────────────────

function SmokeButton({
  label,
  onPress,
  dim = false,
}: {
  label: string;
  onPress: () => void;
  dim?: boolean;
}) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        dim ? styles.btnDim : styles.btnPrimary,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text variant="caption" style={dim ? styles.btnTextDim : styles.btnText}>
        {label}
      </Text>
    </Pressable>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const useStyles = makeStyles((c) => ({
  wrap: {
    marginTop: spacing[3],
    padding: spacing[3],
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderSubtle,
    borderStyle: 'dashed' as const,
    backgroundColor: c.surfaceMuted,
    gap: spacing[2],
  },
  label: {
    letterSpacing: 0.3,
  },
  grid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: spacing[2],
  },
  btn: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  btnPrimary: {
    borderColor: c.accent,
    backgroundColor: c.accentSoft,
  },
  btnDim: {
    borderColor: c.borderSubtle,
    backgroundColor: 'transparent',
  },
  cancelBtn: {
    alignSelf: 'flex-start' as const,
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderSubtle,
  },
  pressed: {
    opacity: 0.65,
  },
  btnText: {
    color: c.accent,
    fontWeight: '500' as const,
  },
  btnTextDim: {
    color: c.inkTertiary,
  },
  status: {
    lineHeight: 16,
  },
}));
