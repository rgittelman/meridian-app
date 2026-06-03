import { View } from 'react-native';

import { GradientCard } from '@/components/shared/surfaces/GradientCard';
import { Text } from '@/components/typography/Text';
import type { BriefContent } from '@/services/notifications/buildBriefContent';
import { spacing } from '@/theme';

type Props = {
  brief: BriefContent;
};

/**
 * Morning Brief / Evening Preview card for the Focus screen.
 *
 * Positioned between the greeting and the Momentum Ring.
 * Read-only — no interaction. Disappears when brief content is null.
 *
 * Copy standard: calm, specific, never guilt, never task counts.
 */
export function DailyBriefCard({ brief }: Props) {
  return (
    <GradientCard style={styles.card}>
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
    </GradientCard>
  );
}

const styles = {
  card: {
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
} as const;
