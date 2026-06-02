import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Settings } from 'lucide-react-native';

import { ScreenContainer } from '@/components/ScreenContainer';
import { NotificationVerificationModal } from '@/components/notifications/NotificationVerificationModal';
import { LifeDomainsView } from '@/components/life/LifeDomainsView';
import { Text } from '@/components/typography/Text';
import { SettingsScreen } from '@/screens/Settings/SettingsScreen';
import { runCaptureIntelligenceQaAudit } from '@/services/capture';
import { isDevEnvironment } from '@/utils/isDev';
import { makeStyles, spacing } from '@/theme';
import { useTheme } from '@/hooks/useTheme';

export function LifeScreen() {
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const styles = useStyles();
  const { colors } = useTheme();
  const showVerification = isDevEnvironment();

  useEffect(() => {
    if (showVerification) {
      runCaptureIntelligenceQaAudit();
    }
  }, [showVerification]);

  return (
    <ScreenContainer scrollable testID="life-screen">
      {/* Screen header */}
      <View style={styles.screenHeader}>
        <Text variant="heading" weight="semibold">
          Life
        </Text>
        <Pressable
          onPress={() => setSettingsOpen(true)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          style={({ pressed }) => pressed && styles.devButtonPressed}
        >
          <Settings size={20} color={colors.inkSecondary} strokeWidth={1.75} />
        </Pressable>
      </View>

      {showVerification ? (
        <View style={styles.devEntry}>
          <Pressable
            onPress={() => setVerificationOpen(true)}
            style={({ pressed }) => [styles.devButton, pressed && styles.devButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Open notification intelligence verification"
          >
            <Text variant="footnote" color="inkSecondary">
              Notification verification (dev)
            </Text>
          </Pressable>
        </View>
      ) : null}
      <LifeDomainsView />
      {showVerification ? (
        <NotificationVerificationModal
          visible={verificationOpen}
          onClose={() => setVerificationOpen(false)}
        />
      ) : null}
      <SettingsScreen visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </ScreenContainer>
  );
}

const useStyles = makeStyles((c) => ({
  screenHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: spacing[4],
  },
  devEntry: {
    marginBottom: spacing[4],
  },
  devButton: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.borderSubtle,
    borderStyle: 'dashed' as const,
    backgroundColor: c.surfaceMuted,
  },
  devButtonPressed: {
    opacity: 0.85,
  },
}));
