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
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as ExpoNotifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { nanoid } from 'nanoid/non-secure';

import { Text } from '@/components/typography/Text';
import { requestNotificationPermissions } from '@/services/notifications/delivery';
import { getNotificationPermissionState } from '@/services/notifications/delivery/notificationPermissions';
import { scheduleBriefDevTest } from '@/hooks/useNotificationBriefScheduler';
import {
  buildMorningBriefContent,
  buildEveningPreviewContent,
} from '@/services/notifications/buildBriefContent';
import { useCalendarStore } from '@/store/calendarStore';
import { useNotificationDeliveryStore } from '@/store/notificationDeliveryStore';
import { useNotificationSettingsStore } from '@/store/notificationSettingsStore';
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

const BRIEF_DELAY_SECONDS = 30;

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

// ── Phase F brief diagnostic panel ───────────────────────────────────────────

export function BriefSmokeTest() {
  const styles = useStyles();
  const [briefStatus, setBriefStatus] = useState<string>('');
  const [recordsText, setRecordsText] = useState<string | null>(null);
  const records = useNotificationDeliveryStore((s) => s.records);

  const handleMorningBriefTest = async () => {
    setBriefStatus('Scheduling Morning Brief…');
    setRecordsText(null);
    const result = await scheduleBriefDevTest('morning', BRIEF_DELAY_SECONDS);
    if (result.ok && result.fireAt) {
      const secs = Math.round((result.fireAt.getTime() - Date.now()) / 1000);
      setBriefStatus(`Morning Brief ✓ fires in ~${secs}s. Background app.`);
    } else {
      setBriefStatus(`Morning Brief skipped: ${result.reason ?? 'unknown'}`);
    }
  };

  const handleEveningPreviewTest = async () => {
    setBriefStatus('Scheduling Evening Preview…');
    setRecordsText(null);
    const result = await scheduleBriefDevTest('evening', BRIEF_DELAY_SECONDS);
    if (result.ok && result.fireAt) {
      const secs = Math.round((result.fireAt.getTime() - Date.now()) / 1000);
      setBriefStatus(`Evening Preview ✓ fires in ~${secs}s. Background app.`);
    } else {
      setBriefStatus(`Evening Preview skipped: ${result.reason ?? 'unknown'}`);
    }
  };

  const handleInspectRecords = () => {
    const scheduled = records.filter((r) => r.deliveryStatus === 'scheduled');
    if (scheduled.length === 0) {
      setRecordsText('── Delivery Records ──\nNo scheduled records.');
      return;
    }
    const lines = scheduled.map((r) => {
      const fireAt = new Date(r.scheduledFor).toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      });
      return `[${r.notificationType}]\n"${r.title}"\n@ ${fireAt}\n${r.bundleKey}`;
    });
    setRecordsText(`── Delivery Records (${scheduled.length}) ──\n` + lines.join('\n─\n'));
  };

  const handleDiagnose = async () => {
    const now = new Date();
    const settings = useNotificationSettingsStore.getState();
    const permission = await getNotificationPermissionState();

    const { weekEvents, upcomingEvents } = useCalendarStore.getState();
    const seen = new Set<string>();
    const allEvents = [...weekEvents, ...upcomingEvents].filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });

    const morningContent = buildMorningBriefContent(allEvents, now);
    const eveningContent = buildEveningPreviewContent(allEvents, now);

    // Compute next targets
    const nextMorning = new Date(now);
    nextMorning.setHours(7, 15, 0, 0);
    if (nextMorning.getTime() <= now.getTime()) nextMorning.setDate(nextMorning.getDate() + 1);

    const nextEvening = new Date(now);
    nextEvening.setHours(19, 0, 0, 0);
    if (nextEvening.getTime() <= now.getTime()) nextEvening.setDate(nextEvening.getDate() + 1);

    const fmt = (d: Date) =>
      d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) +
      ' ' +
      d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

    const lines = [
      '── Brief Scheduler Diagnosis ──',
      `Time now:          ${fmt(now)}`,
      `Master enabled:    ${settings.enabled}`,
      `Morning Brief on:  ${settings.morningBriefEnabled}`,
      `Evening Preview on:${settings.eveningPreviewEnabled}`,
      `Permission:        ${permission}`,
      `Calendar events:   ${allEvents.length} (${weekEvents.length} week + ${upcomingEvents.length} upcoming)`,
      `Morning content:   ${morningContent ? 'has_content' : 'no_content'}`,
      `Evening content:   ${eveningContent ? 'has_content' : 'no_content'}`,
      `Next morning target: ${fmt(nextMorning)}`,
      `Next evening target: ${fmt(nextEvening)}`,
    ];

    // Explain why a brief would be skipped
    const morningSkipReasons: string[] = [];
    if (!settings.enabled) morningSkipReasons.push('master disabled');
    if (!settings.morningBriefEnabled) morningSkipReasons.push('toggle off');
    if (permission !== 'granted' && permission !== 'provisional') morningSkipReasons.push(`permission:${permission}`);
    if (!morningContent) morningSkipReasons.push('no calendar content');

    lines.push(
      morningSkipReasons.length === 0
        ? 'Morning Brief: WOULD SCHEDULE ✓'
        : `Morning Brief: SKIPPED — ${morningSkipReasons.join(', ')}`,
    );

    const eveningSkipReasons: string[] = [];
    if (!settings.enabled) eveningSkipReasons.push('master disabled');
    if (!settings.eveningPreviewEnabled) eveningSkipReasons.push('toggle off');
    if (permission !== 'granted' && permission !== 'provisional') eveningSkipReasons.push(`permission:${permission}`);
    if (!eveningContent) eveningSkipReasons.push('no tomorrow content');

    lines.push(
      eveningSkipReasons.length === 0
        ? 'Evening Preview: WOULD SCHEDULE ✓'
        : `Evening Preview: SKIPPED — ${eveningSkipReasons.join(', ')}`,
    );

    setRecordsText(lines.join('\n'));
  };

  return (
    <View style={styles.wrap}>
      <Text variant="caption" color="inkGhost" style={styles.label}>
        Morning Brief / Evening Preview (dev · Phase F)
      </Text>

      <View style={styles.grid}>
        <SmokeButton label="Morning Brief" onPress={handleMorningBriefTest} />
        <SmokeButton label="Evening Preview" onPress={handleEveningPreviewTest} />
        <SmokeButton label="Inspect Records" onPress={handleInspectRecords} dim />
        <SmokeButton label="Diagnose" onPress={handleDiagnose} dim />
      </View>

      {briefStatus ? (
        <Text variant="caption" color="inkGhost" style={styles.status}>
          {briefStatus}
        </Text>
      ) : null}

      {recordsText ? (
        <ScrollView style={styles.recordsScroll} nestedScrollEnabled>
          <Text variant="caption" color="inkTertiary" style={styles.records}>
            {recordsText}
          </Text>
        </ScrollView>
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
  recordsScroll: {
    maxHeight: 180,
    marginTop: spacing[1],
  },
  records: {
    lineHeight: 18,
    fontFamily: 'monospace' as const,
  },
}));
