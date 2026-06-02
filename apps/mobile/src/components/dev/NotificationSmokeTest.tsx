/**
 * DEV ONLY — Notification delivery smoke test.
 *
 * Renders two buttons:
 *   "Send test notification"   — requests permission, schedules in 30 seconds
 *   "Cancel test notification" — cancels the scheduled notification
 *
 * This component must ONLY be rendered when __DEV__ is true.
 * Remove this file and its import in CaptureScreen.tsx after verifying delivery.
 *
 * HOW TO TEST
 * -----------
 * 1. Run `npx expo run:ios` (native build required for expo-notifications).
 * 2. Open the Capture tab.
 * 3. Tap "Send test notification".
 *    - Accept the system permission dialog if prompted.
 *    - Check the status line below the button for confirmation.
 * 4. Background the app (Home button / swipe up).
 * 5. Wait ~30 seconds — the notification should appear in the system tray.
 * 6. Tap the notification to verify it navigates back to the app.
 * 7. Optionally: tap "Cancel test notification" within the 30-second window
 *    to verify cancellation.
 *
 * HOW TO REMOVE
 * -------------
 * 1. Delete this file.
 * 2. Remove the <NotificationSmokeTest /> block from CaptureScreen.tsx.
 */

import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { nanoid } from 'nanoid/non-secure';

import { Text } from '@/components/typography/Text';
import {
  ExpoNotificationDeliveryScheduler,
  requestNotificationPermissions,
} from '@/services/notifications/delivery';
import { useNotificationDeliveryStore } from '@/store/notificationDeliveryStore';
import type { ApprovedNotificationBundle } from '@/types/notificationDelivery';
import { makeStyles, radius, spacing } from '@/theme';

const DELAY_SECONDS = 30;

/**
 * Stable bundle: same `bundleKey` and a `targetWindowStart` truncated to the
 * current minute so rapid taps within the same minute produce an identical
 * dedupe key, letting the scheduler's Gate 4 catch them even without the
 * in-flight guard. Together with the in-flight Set in the scheduler, this
 * makes duplicates impossible from the smoke test UI.
 */
function makeTestBundle(): ApprovedNotificationBundle {
  const now = new Date();
  const fireAt = new Date(now.getTime() + DELAY_SECONDS * 1000);
  // Truncate to second precision so taps within the same second are identical
  fireAt.setMilliseconds(0);

  return {
    id: `smoke-test-${nanoid()}`,
    bundleKey: 'smoke-test',
    type: 'morning_brief',
    candidateIds: [],
    title: 'Meridian test',
    lines: ['Smart notifications are connected.'],
    decision: 'send',
    suppressionReason: null,
    interruptionReason: 'Manual smoke test from dev build.',
    targetWindowStart: fireAt,
    targetWindowEnd: new Date(fireAt.getTime() + 60_000),
    householdImpact: 'medium',
    interruptionScore: {
      total: 50,
      householdImpact: 18,
      timingSensitivity: 14,
      conflictRisk: 0,
      prepRelevance: 0,
      peopleImpact: 10,
      confidence: 12,
    },
  };
}

export function NotificationSmokeTest() {
  const styles = useStyles();
  const [status, setStatus] = useState<string>('');
  const scheduledBundleId = useRef<string | null>(null);
  const scheduler = useRef(new ExpoNotificationDeliveryScheduler());
  const setPermissionState = useNotificationDeliveryStore((s) => s.setPermissionState);

  const handleSend = async () => {
    // UI guard: if a notification is already scheduled, refuse a duplicate.
    // This catches sequential re-taps; the scheduler's in-flight Set catches
    // concurrent async races.
    if (scheduledBundleId.current !== null) {
      setStatus('Already scheduled — wait for it to fire or tap Cancel first.');
      return;
    }

    setStatus('Requesting permission…');

    // Step 1 — request permission (only on explicit user tap)
    const permission = await requestNotificationPermissions();
    setPermissionState(permission);

    if (permission !== 'granted' && permission !== 'provisional') {
      setStatus(`Permission: ${permission}. Enable notifications in iOS Settings.`);
      return;
    }

    // Step 2 — build and schedule the test bundle
    setStatus('Scheduling…');
    const bundle = makeTestBundle();
    const scheduledFor = bundle.targetWindowStart;

    const result = await scheduler.current.scheduleApprovedBundle(bundle, { scheduledFor });

    if (result.ok) {
      scheduledBundleId.current = bundle.id;
      const secs = Math.round((scheduledFor.getTime() - Date.now()) / 1000);
      setStatus(`Scheduled ✓ fires in ~${secs}s. Background the app to receive it.`);
    } else {
      setStatus(`Failed: ${result.reason} — ${result.message}`);
    }
  };

  const handleCancel = async () => {
    const id = scheduledBundleId.current;
    if (!id) {
      setStatus('Nothing to cancel.');
      return;
    }
    await scheduler.current.cancelScheduledBundle(id, 'manual_clear');
    scheduledBundleId.current = null;
    setStatus('Cancelled.');
  };

  return (
    <View style={styles.wrap}>
      <Text variant="caption" color="inkGhost" style={styles.label}>
        Notification smoke test (dev)
      </Text>

      <View style={styles.row}>
        <Pressable
          onPress={handleSend}
          style={({ pressed }) => [styles.btn, styles.btnSend, pressed && styles.btnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Send test notification"
        >
          <Text variant="footnote" style={styles.btnTextSend}>
            Send test notification
          </Text>
        </Pressable>

        <Pressable
          onPress={handleCancel}
          style={({ pressed }) => [styles.btn, styles.btnCancel, pressed && styles.btnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Cancel test notification"
        >
          <Text variant="footnote" style={styles.btnTextCancel}>
            Cancel
          </Text>
        </Pressable>
      </View>

      {status ? (
        <Text variant="caption" color="inkGhost" style={styles.status}>
          {status}
        </Text>
      ) : null}
    </View>
  );
}

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
  row: {
    flexDirection: 'row' as const,
    gap: spacing[2],
  },
  btn: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  btnSend: {
    flex: 1,
    alignItems: 'center' as const,
    borderColor: c.accent,
    backgroundColor: c.accentSoft,
  },
  btnCancel: {
    borderColor: c.borderSubtle,
  },
  btnPressed: {
    opacity: 0.65,
  },
  btnTextSend: {
    color: c.accent,
    fontWeight: '500' as const,
  },
  btnTextCancel: {
    color: c.inkTertiary,
  },
  status: {
    lineHeight: 16,
  },
}));
