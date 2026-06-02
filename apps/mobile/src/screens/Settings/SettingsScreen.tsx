import { useState } from 'react';
import { Alert, Linking, Modal, Pressable, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { Text } from '@/components/typography/Text';
import { NotificationPermissionPrompt } from '@/screens/Settings/NotificationPermissionPrompt';
import { useCalendarStore } from '@/store/calendarStore';
import { useNotificationDeliveryStore } from '@/store/notificationDeliveryStore';
import { useNotificationSettingsStore } from '@/store/notificationSettingsStore';
import { makeStyles, radius, spacing } from '@/theme';
import { useTheme } from '@/hooks/useTheme';
import Constants from 'expo-constants';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function SettingsScreen({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

  const permissionState = useNotificationDeliveryStore((s) => s.permissionState);
  const calendarStatus = useCalendarStore((s) => s.status);
  const disconnect = useCalendarStore((s) => s.disconnect);

  const {
    enabled,
    morningBriefEnabled,
    eveningPreviewEnabled,
    beforeEventsEnabled,
    criticalAlertsEnabled,
    setEnabled,
    setMorningBriefEnabled,
    setEveningPreviewEnabled,
    setBeforeEventsEnabled,
    setCriticalAlertsEnabled,
  } = useNotificationSettingsStore();

  const appVersion = Constants.expoConfig?.version ?? '—';

  const handleNotificationToggle = (value: boolean) => {
    if (value) {
      if (permissionState === 'granted' || permissionState === 'provisional') {
        setEnabled(true);
      } else {
        setShowPermissionPrompt(true);
      }
    } else {
      setEnabled(false);
    }
  };

  const handleDisconnectCalendar = () => {
    Alert.alert(
      'Disconnect Calendar',
      'This will remove your Google Calendar connection. You can reconnect from the Plan screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => void disconnect(),
        },
      ],
    );
  };

  const isCalendarConnected =
    calendarStatus === 'connected' || calendarStatus === 'partial_sync';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.root, { paddingTop: insets.top + spacing[4] }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="heading" weight="semibold">
            Settings
          </Text>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close settings"
            style={({ pressed }) => pressed && styles.pressed}
          >
            <X size={22} color={colors.inkSecondary} strokeWidth={1.75} />
          </Pressable>
        </View>

        {/* Notifications section */}
        <View style={styles.section}>
          <Text variant="footnote" color="inkTertiary" style={styles.sectionLabel}>
            NOTIFICATIONS
          </Text>

          <View style={styles.card}>
            <SettingsRow
              label="Enable Meridian Notifications"
              value={enabled}
              onToggle={handleNotificationToggle}
            />
            <Separator />
            <SettingsRow
              label="Morning Brief"
              value={morningBriefEnabled}
              onToggle={setMorningBriefEnabled}
              disabled={!enabled}
            />
            <Separator />
            <SettingsRow
              label="Evening Preview"
              value={eveningPreviewEnabled}
              onToggle={setEveningPreviewEnabled}
              disabled={!enabled}
            />
            <Separator />
            <SettingsRow
              label="Before Events"
              value={beforeEventsEnabled}
              onToggle={setBeforeEventsEnabled}
              disabled={!enabled}
            />
            <Separator />
            <SettingsRow
              label="Critical Alerts"
              value={criticalAlertsEnabled}
              onToggle={setCriticalAlertsEnabled}
              disabled={!enabled}
            />
          </View>
        </View>

        {/* Calendar section */}
        <View style={styles.section}>
          <Text variant="footnote" color="inkTertiary" style={styles.sectionLabel}>
            CALENDAR
          </Text>

          <View style={styles.card}>
            <View style={styles.row}>
              <Text variant="body">Connected Account</Text>
              <Text variant="footnote" color="inkSecondary">
                {isCalendarConnected ? 'Google' : 'Not connected'}
              </Text>
            </View>
            {isCalendarConnected && (
              <>
                <Separator />
                <Pressable
                  onPress={handleDisconnectCalendar}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Disconnect Google Calendar"
                >
                  <Text variant="body" color="warning">
                    Disconnect Calendar
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </View>

        {/* App section */}
        <View style={styles.section}>
          <Text variant="footnote" color="inkTertiary" style={styles.sectionLabel}>
            APP
          </Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text variant="body" color="inkSecondary">
                Version
              </Text>
              <Text variant="body" color="inkSecondary">
                {appVersion}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Permission prompt — presented as a second modal layer */}
      <Modal
        visible={showPermissionPrompt}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPermissionPrompt(false)}
      >
        <View style={[styles.root, { paddingTop: insets.top + spacing[4] }]}>
          <NotificationPermissionPrompt onDone={() => setShowPermissionPrompt(false)} />
        </View>
      </Modal>
    </Modal>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SettingsRow({
  label,
  value,
  onToggle,
  disabled = false,
}: {
  label: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  disabled?: boolean;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Text variant="body" color={disabled ? 'inkGhost' : 'ink'}>
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor={colors.ink}
        ios_backgroundColor={colors.surfaceElevated}
      />
    </View>
  );
}

function Separator() {
  const styles = useStyles();
  return <View style={styles.separator} />;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const useStyles = makeStyles((c) => ({
  root: {
    flex: 1,
    backgroundColor: c.background,
    paddingHorizontal: spacing[4],
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: spacing[6],
  },
  section: {
    marginBottom: spacing[5],
  },
  sectionLabel: {
    marginBottom: spacing[2],
    marginLeft: spacing[1],
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden' as const,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    minHeight: 48,
  },
  separator: {
    height: 1,
    backgroundColor: c.borderSubtle,
    marginLeft: spacing[4],
  },
  pressed: {
    opacity: 0.72,
  },
}));
