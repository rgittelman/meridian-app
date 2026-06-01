import { CheckCircle2 } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/typography/Text';
import { colors, radius, spacing } from '@/theme';

type CalmWinsProps = {
  count?: number;
};

function buildWinsLabel(count: number): string {
  if (count === 0) return 'All clear for now.';
  if (count === 1) return '1 thing already handled today.';
  return `${count} things already handled today.`;
}

export function CalmWins({ count = 3 }: CalmWinsProps) {
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
        style={styles.icon}
      />
      <Text
        variant="callout"
        color="inkTertiary"
        style={styles.text}
        maxFontSizeMultiplier={1.2}
      >
        {buildWinsLabel(count)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.successSoft,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
  },
  icon: {
    flexShrink: 0,
  },
  text: {
    flex: 1,
  },
});
