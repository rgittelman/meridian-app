import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Settings, X } from 'lucide-react-native';

import { GradientCard } from '@/components/shared/surfaces/GradientCard';
import { StatusPill } from '@/components/shared/primitives/StatusPill';
import { ProfileAvatar } from '@/components/shared/primitives/ProfileAvatar';
import { Text } from '@/components/typography/Text';
import { SettingsScreen } from '@/screens/Settings/SettingsScreen';
import { useGoogleAuthStore } from '@/store/googleAuthStore';
import { useProfileStore } from '@/store/profileStore';
import { makeStyles, spacing } from '@/theme';
import { useTheme } from '@/hooks/useTheme';

type ProfileModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function ProfileModal({ visible, onClose }: ProfileModalProps) {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const displayName = useProfileStore((s) => s.displayName);
  const isAuthenticated = useGoogleAuthStore((s) => s.isAuthenticated);

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
            Profile
          </Text>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close profile"
            style={({ pressed }) => pressed && styles.pressed}
          >
            <X size={22} color={colors.inkSecondary} strokeWidth={1.75} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>

          {/* ── Identity ───────────────────────────────────────────── */}
          <View style={styles.section}>
            <GradientCard style={styles.identityCard}>
              {/* Avatar */}
              <View style={styles.avatarRow}>
                <ProfileAvatar size={64} />
              </View>

              {/* Name — only shown when known */}
              {displayName ? (
                <Text
                  variant="title"
                  color="ink"
                  align="center"
                  weight="semibold"
                  style={styles.displayName}
                >
                  {displayName}
                </Text>
              ) : null}

              {/* Connection status */}
              {isAuthenticated ? (
                <View style={styles.connectionRow}>
                  <Text variant="footnote" color="inkSecondary">
                    Connected via Google
                  </Text>
                  <StatusPill label="Connected" sentiment="positive" />
                </View>
              ) : null}
            </GradientCard>
          </View>

          {/* ── Settings entry ─────────────────────────────────────── */}
          <View style={styles.section}>
            <GradientCard style={styles.rowCard}>
              <Pressable
                onPress={() => setSettingsOpen(true)}
                style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Open settings"
              >
                <View style={styles.settingsLeft}>
                  <Settings size={18} color={colors.inkSecondary} strokeWidth={1.75} />
                  <Text variant="body">Settings</Text>
                </View>
                <ChevronRight size={16} color={colors.inkSecondary} strokeWidth={1.75} />
              </Pressable>
            </GradientCard>
          </View>

        </ScrollView>
      </View>

      {/* Settings — nested pageSheet on top of Profile */}
      <SettingsScreen
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </Modal>
  );
}

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
  pressed: {
    opacity: 0.72,
  },
  section: {
    marginBottom: spacing[4],
  },
  identityCard: {
    alignItems: 'center' as const,
    gap: spacing[3],
    paddingVertical: spacing[5],
  },
  avatarRow: {
    alignItems: 'center' as const,
  },
  displayName: {
    maxWidth: 280,
  },
  connectionRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing[2],
  },
  rowCard: {
    padding: 0,
    overflow: 'hidden' as const,
    borderRadius: 14,
  },
  settingsRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    minHeight: 48,
  },
  settingsLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing[3],
  },
}));
