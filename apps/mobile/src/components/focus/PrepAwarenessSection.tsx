import { GradientCard } from '@/components/shared/surfaces/GradientCard';
import { Text } from '@/components/typography/Text';
import type { PrepAwarenessItem } from '@/types/prep';
import { makeStyles, radius, spacing } from '@/theme';

type PrepAwarenessSectionProps = {
  items: PrepAwarenessItem[];
  overflowCount?: number;
  /** Called when user taps a prep card. Receives the related calendar event id. */
  onEventPress?: (eventId: string) => void;
};

function PrepAwarenessCard({
  item,
  onPress,
}: {
  item: PrepAwarenessItem;
  onPress?: () => void;
}) {
  return (
    <GradientCard style={cardStyle.inner} accessibilityRole={onPress ? 'button' : 'text'} onPress={onPress}>
      <Text variant="callout" color="ink" maxFontSizeMultiplier={1.1}>
        {item.primaryLabel}
      </Text>
      {item.contextLine ? (
        <Text variant="footnote" color="inkSecondary" maxFontSizeMultiplier={1.05}>
          {item.contextLine}
        </Text>
      ) : null}
      {item.body ? (
        <Text variant="footnote" color="inkSecondary" maxFontSizeMultiplier={1.05}>
          {item.body}
        </Text>
      ) : null}
      {item.connectedSummary ? (
        <Text variant="caption" color="inkGhost" maxFontSizeMultiplier={1.0}>
          {item.connectedSummary}
        </Text>
      ) : null}
    </GradientCard>
  );
}

export function PrepAwarenessSection({
  items,
  overflowCount = 0,
  onEventPress,
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
    <GradientCard style={styles.wrap} accessibilityRole="none">
      <Text variant="caption" color="inkGhost" style={styles.eyebrow}>
        Before you go
      </Text>
      {items.map((item) => (
        <PrepAwarenessCard
          key={item.id}
          item={item}
          onPress={onEventPress ? () => onEventPress(item.eventId) : undefined}
        />
      ))}
      {overflowLine ? (
        <Text variant="footnote" color="inkGhost" maxFontSizeMultiplier={1.05}>
          {overflowLine}
        </Text>
      ) : null}
    </GradientCard>
  );
}

// Inner cards use a tighter radius than the outer container (radius.sm vs radius.md)
// to make the nested structure legible — contents visually sit inside the shell
const cardStyle = {
  inner: { gap: spacing[1], padding: spacing[3], borderRadius: radius.sm } as const,
};

const useStyles = makeStyles((c) => ({
  wrap: {
    gap: spacing[3],
    backgroundColor: c.surfaceMuted,
  },
  eyebrow: {
    letterSpacing: 0.5,
  },
}));
