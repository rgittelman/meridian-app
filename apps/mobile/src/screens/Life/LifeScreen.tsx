import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { ScreenContainer } from '@/components/ScreenContainer';
import { NotificationVerificationModal } from '@/components/notifications/NotificationVerificationModal';
import { LifeDomainsView } from '@/components/life/LifeDomainsView';
import { Text } from '@/components/typography/Text';
import { runCaptureIntelligenceQaAudit } from '@/services/capture';
import { isDevEnvironment } from '@/utils/isDev';
import { makeStyles, spacing } from '@/theme';

export function LifeScreen() {
  const [verificationOpen, setVerificationOpen] = useState(false);
  const styles = useStyles();
  const showVerification = isDevEnvironment();

  useEffect(() => {
    if (showVerification) {
      runCaptureIntelligenceQaAudit();
    }
  }, [showVerification]);

  return (
    <ScreenContainer scrollable testID="life-screen">
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
    </ScreenContainer>
  );
}

const useStyles = makeStyles((c) => ({
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
