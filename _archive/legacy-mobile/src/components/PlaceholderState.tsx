import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/typography/Text';
import type { ScreenPlaceholder } from '@/constants/screens';
import { colors, spacing } from '@/theme';

type PlaceholderStateProps = ScreenPlaceholder;

export function PlaceholderState({ title, headline, supporting }: PlaceholderStateProps) {
  return (
    <View style={styles.wrap} accessibilityLabel={`${title}. ${headline}`}>
      <Text variant="caption" color="inkTertiary" style={styles.eyebrow}>
        {title}
      </Text>
      <Text variant="display" color="ink" style={styles.headline}>
        {headline}
      </Text>
      <Text variant="body" color="inkSecondary" style={styles.supporting}>
        {supporting}
      </Text>
      <View style={styles.accentLine} accessibilityElementsHidden importantForAccessibility="no" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: spacing[10],
  },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: spacing[4],
  },
  headline: {
    marginBottom: spacing[5],
    maxWidth: 320,
  },
  supporting: {
    maxWidth: 300,
  },
  accentLine: {
    marginTop: spacing[8],
    width: 40,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.accentMuted,
  },
});
