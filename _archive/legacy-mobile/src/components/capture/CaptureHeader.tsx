import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/typography/Text';
import { spacing } from '@/theme';

const HEADLINES = [
  "What's taking up space?",
  'Get it out of your head.',
  "Throw thoughts here. Meridian organizes later.",
] as const;

type CaptureHeaderProps = {
  variant?: 0 | 1 | 2;
};

export function CaptureHeader({ variant = 0 }: CaptureHeaderProps) {
  return (
    <View style={styles.wrap} accessibilityRole="header">
      <Text
        variant="title"
        color="ink"
        style={styles.headline}
        maxFontSizeMultiplier={1.2}
      >
        {HEADLINES[variant]}
      </Text>
      <Text
        variant="body"
        color="inkTertiary"
        style={styles.supporting}
        maxFontSizeMultiplier={1.25}
      >
        No structure needed. Just say what it is.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing[2],
  },
  headline: {},
  supporting: {},
});
