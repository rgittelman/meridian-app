import { CheckCircle2 } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/typography/Text';
import { useTheme } from '@/hooks/useTheme';
import { makeStyles, radius, spacing } from '@/theme';

type CalmWinsProps = { count?: number };

function buildWinsLabel(count: number): string {
  if (count === 0) return 'All clear for now.';
  if (count === 1) return '1 thing already handled today.';
  return `${count} things already handled today.`;
}

export function CalmWins({ count = 3 }: CalmWinsProps) {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <View
      style={styles.wrap}
      accessibilityLabel={buildWinsLabel(count)}
      accessibilityRole="text"
    >
      <CheckCircle2
        size={15}
        color={colors.winsAccent}
        strokeWidth={2}
        style={staticStyles.icon}
      />
      <Text
        variant="callout"
        color="inkTertiary"
        style={staticStyles.text}
        maxFontSizeMultiplier={1.2}
      >
        {buildWinsLabel(count)}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing[2],
    backgroundColor: c.successSoft,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderSubtle,
  },
}));

const staticStyles = StyleSheet.create({
  icon: { flexShrink: 0 },
  text: { flex: 1 },
});
