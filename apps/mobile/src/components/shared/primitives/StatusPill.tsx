import { View } from 'react-native';

import { Text } from '@/components/typography/Text';
import { makeStyles, radius, spacing } from '@/theme';
import { useTheme } from '@/hooks/useTheme';

export type StatusSentiment = 'positive' | 'neutral' | 'caution' | 'warning';

type StatusPillProps = {
  label: string;
  sentiment?: StatusSentiment;
};

export function StatusPill({ label, sentiment = 'neutral' }: StatusPillProps) {
  const { colors } = useTheme();
  const styles = useStyles();

  const { bg, fg } = sentimentColors(colors, sentiment);

  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text variant="caption" weight="medium" style={{ color: fg }}>
        {label}
      </Text>
    </View>
  );
}

function sentimentColors(
  colors: { success: string; successSoft: string; warning: string; warningSoft: string; accent: string; accentSoft: string; inkTertiary: string; surfaceElevated: string },
  sentiment: StatusSentiment,
): { bg: string; fg: string } {
  switch (sentiment) {
    case 'positive':
      return { bg: colors.successSoft, fg: colors.success };
    case 'warning':
      return { bg: colors.warningSoft, fg: colors.warning };
    case 'caution':
      return { bg: colors.accentSoft, fg: colors.accent };
    case 'neutral':
    default:
      return { bg: colors.surfaceElevated, fg: colors.inkTertiary };
  }
}

const useStyles = makeStyles(() => ({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
  },
}));
