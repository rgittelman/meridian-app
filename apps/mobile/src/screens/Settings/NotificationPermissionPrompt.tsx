import { Linking, Pressable, View } from 'react-native';

import { Text } from '@/components/typography/Text';
import { requestNotificationPermissions } from '@/services/notifications/delivery/notificationPermissions';
import { useNotificationDeliveryStore } from '@/store/notificationDeliveryStore';
import { useNotificationSettingsStore } from '@/store/notificationSettingsStore';
import { makeStyles, radius, spacing } from '@/theme';

type Props = {
  onDone: () => void;
};

export function NotificationPermissionPrompt({ onDone }: Props) {
  const styles = useStyles();
  const permissionState = useNotificationDeliveryStore((s) => s.permissionState);
  const setPermissionState = useNotificationDeliveryStore((s) => s.setPermissionState);
  const setEnabled = useNotificationSettingsStore((s) => s.setEnabled);

  const isDenied = permissionState === 'denied';

  const handleAllow = async () => {
    if (isDenied) {
      await Linking.openSettings();
      onDone();
      return;
    }
    const result = await requestNotificationPermissions();
    setPermissionState(result);
    if (result === 'granted' || result === 'provisional') {
      setEnabled(true);
    }
    onDone();
  };

  const handleNotNow = () => {
    setEnabled(false);
    onDone();
  };

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <Text variant="title" weight="semibold" style={styles.heading}>
          {isDenied ? 'Notifications are off' : 'Meridian notifications are rare.'}
        </Text>

        {isDenied ? (
          <Text variant="body" color="inkSecondary" style={styles.body}>
            You've turned off notifications for Meridian. To re-enable them, open Settings and allow
            notifications.
          </Text>
        ) : (
          <>
            <Text variant="body" color="inkSecondary" style={styles.body}>
              They fire before Grace's practice.{'\n'}
              Before a meeting you might miss.{'\n'}
              Never for things you already know.
            </Text>
          </>
        )}

        <Pressable
          onPress={handleAllow}
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={isDenied ? 'Open Settings' : 'Allow Notifications'}
        >
          <Text variant="body" weight="semibold" color="background">
            {isDenied ? 'Open Settings' : 'Allow Notifications'}
          </Text>
        </Pressable>

        <Pressable
          onPress={handleNotNow}
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Not Now"
        >
          <Text variant="body" color="inkSecondary">
            Not Now
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: {
    flex: 1,
    justifyContent: 'flex-end' as const,
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[10],
  },
  content: {
    gap: spacing[4],
  },
  heading: {
    marginBottom: spacing[1],
  },
  body: {
    lineHeight: 24,
  },
  primary: {
    backgroundColor: c.ink,
    borderRadius: radius.lg,
    paddingVertical: spacing[4],
    alignItems: 'center' as const,
    marginTop: spacing[2],
  },
  secondary: {
    alignItems: 'center' as const,
    paddingVertical: spacing[3],
  },
  pressed: {
    opacity: 0.72,
  },
}));
