import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/typography/Text';
import { spacing } from '@/theme';

type CaptureHeaderProps = {
  /** @deprecated Variants unused — single calm headline for clarity */
  variant?: 0 | 1 | 2;
};

export function CaptureHeader(_props: CaptureHeaderProps) {
  return (
    <View style={styles.wrap} accessibilityRole="header">
      <Text
        variant="title"
        color="ink"
        style={styles.headline}
        maxFontSizeMultiplier={1.2}
      >
        What&apos;s on your mind?
      </Text>
      <Text
        variant="body"
        color="inkTertiary"
        style={styles.supporting}
        maxFontSizeMultiplier={1.25}
      >
        No structure needed. Just say it.
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
