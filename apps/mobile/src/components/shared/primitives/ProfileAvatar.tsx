import { useEffect } from 'react';
import { Image, View } from 'react-native';

import { Text } from '@/components/typography/Text';
import { useGoogleAuthStore } from '@/store/googleAuthStore';
import { useProfileStore } from '@/store/profileStore';
import { useTheme } from '@/hooks/useTheme';

type ProfileAvatarProps = {
  /** Diameter in dp. Default 40. Use 28 for header, 64 for modal. */
  size?: number;
};

/**
 * Circular profile avatar with three-tier fallback:
 *   1. avatarUrl — rendered as circular Image (J.2+; null in J.1)
 *   2. initials  — e.g. "RG", "R"
 *   3. "M"       — Meridian fallback when no name is available
 *
 * Also seeds profileStore from googleAuthStore on mount (idempotent).
 */
export function ProfileAvatar({ size = 40 }: ProfileAvatarProps) {
  const { colors } = useTheme();
  const avatarUrl = useProfileStore((s) => s.avatarUrl);
  const initials = useProfileStore((s) => s.initials);
  const seedFromAuth = useProfileStore((s) => s.seedFromAuth);

  // Seed display name from Google auth on first mount — write-once, idempotent
  useEffect(() => {
    const authName = useGoogleAuthStore.getState().userDisplayName;
    seedFromAuth(authName);
  }, [seedFromAuth]);

  const fontSize = Math.round(size * 0.38);
  const label = initials ?? 'M';

  const circleStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: colors.accent,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    overflow: 'hidden' as const,
  };

  if (avatarUrl) {
    return (
      <View style={circleStyle}>
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: size, height: size }}
          accessibilityLabel="Profile photo"
        />
      </View>
    );
  }

  return (
    <View style={circleStyle} accessibilityLabel={`Profile: ${label}`}>
      <Text
        style={{
          color: colors.background,
          fontSize,
          fontWeight: '600',
          lineHeight: fontSize * 1.2,
          includeFontPadding: false,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
