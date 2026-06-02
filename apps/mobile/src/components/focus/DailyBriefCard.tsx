import { View } from 'react-native';

import { Text } from '@/components/typography/Text';
import type { BriefContent } from '@/services/notifications/buildBriefContent';
import { makeStyles, radius, spacing } from '@/theme';

type Props = {
  brief: BriefContent;
};

/**
 * Morning Brief / Evening Preview card for the Focus screen.
 *
 * Positioned between the greeting and the Momentum Ring.
 * Reads-only — no interaction. Disappears when brief content is null.
 *
 * Copy standard: calm, specific, never guilt, never task counts.
 */
export function DailyBriefCard({ brief }: Props) {
  const styles = useStyles();

  return (
    <View style={styles.card} accessibilityRole="text">
      <Text variant="body" color="ink" style={styles.primary}>
        {brief.primaryLine}
      </Text>
      {brief.commitmentLines.length > 0 && (
        <View style={styles.commitments}>
          {brief.commitmentLines.map((line, i) => (
            <Text key={i} variant="callout" color="inkSecondary" style={styles.commitment}>
              {line}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  card: {
    backgroundColor: c.surfaceMuted,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.borderSubtle,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    gap: spacing[2],
  },
  primary: {
    lineHeight: 24,
  },
  commitments: {
    gap: spacing[1],
  },
  commitment: {
    lineHeight: 20,
  },
}));
