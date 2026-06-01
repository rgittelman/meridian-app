import { View } from 'react-native';

import { Text } from '@/components/typography/Text';
import type { ScreenPlaceholder } from '@/constants/screens';
import { makeStyles, spacing } from '@/theme';

type PlaceholderStateProps = ScreenPlaceholder;

export function PlaceholderState({ title, headline, supporting }: PlaceholderStateProps) {
  const styles = useStyles();
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
      <View
        style={styles.accentLine}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: {
    flex: 1,
    justifyContent: 'center' as const,
    paddingBottom: spacing[10],
  },
  eyebrow: {
    letterSpacing: 0.4,
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
    backgroundColor: c.accentMuted,
  },
}));
