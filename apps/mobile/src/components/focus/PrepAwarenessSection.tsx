import { View } from 'react-native';

import { Text } from '@/components/typography/Text';
import type { PrepAwarenessItem } from '@/types/prep';
import { makeStyles, radius, spacing } from '@/theme';

type PrepAwarenessSectionProps = {
  items: PrepAwarenessItem[];
  overflowCount?: number;
};

function PrepAwarenessCard({ item }: { item: PrepAwarenessItem }) {
  const styles = useCardStyles();

  return (
    <View style={styles.card} accessibilityRole="text">
      <Text variant="callout" color="ink" maxFontSizeMultiplier={1.1}>
        {item.primaryLabel}
      </Text>
      {item.contextLine ? (
        <Text variant="footnote" color="inkSecondary" maxFontSizeMultiplier={1.05}>
          {item.contextLine}
        </Text>
      ) : null}
      {item.body ? (
        <Text variant="footnote" style={styles.body} maxFontSizeMultiplier={1.05}>
          {item.body}
        </Text>
      ) : null}
      {item.connectedSummary ? (
        <Text variant="caption" color="inkGhost" maxFontSizeMultiplier={1.0}>
          {item.connectedSummary}
        </Text>
      ) : null}
    </View>
  );
}

export function PrepAwarenessSection({
  items,
  overflowCount = 0,
}: PrepAwarenessSectionProps) {
  const styles = useStyles();

  if (items.length === 0) return null;

  const overflowLine =
    overflowCount > 0
      ? overflowCount === 1
        ? '1 more prep thread connected to upcoming commitments'
        : `${overflowCount} more prep threads connected to upcoming commitments`
      : null;

  return (
    <View style={styles.wrap}>
      <Text variant="caption" color="inkTertiary" style={styles.eyebrow}>
        Before you go
      </Text>
      {items.map((item) => (
        <PrepAwarenessCard key={item.id} item={item} />
      ))}
      {overflowLine ? (
        <Text variant="footnote" color="inkGhost" maxFontSizeMultiplier={1.05}>
          {overflowLine}
        </Text>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: {
    gap: spacing[2],
  },
  eyebrow: {
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
    color: c.inkGhost,
  },
}));

const useCardStyles = makeStyles((c) => ({
  card: {
    backgroundColor: c.surfaceMuted,
    borderRadius: radius.sm,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    gap: spacing[1],
    borderWidth: 1,
    borderColor: c.borderSubtle,
  },
  body: {
    color: c.inkSecondary,
  },
}));
