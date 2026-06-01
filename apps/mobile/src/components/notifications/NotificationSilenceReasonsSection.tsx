import { View } from 'react-native';

import { Text } from '@/components/typography/Text';
import type { NotificationSystemStatus } from '@/types/notification';
import { makeStyles, spacing } from '@/theme';

type NotificationSilenceReasonsSectionProps = {
  reasons: string[];
  systemStatus: NotificationSystemStatus;
  wouldSendCount: number;
  generatedCount: number;
};

const STATUS_HEADLINE: Record<NotificationSystemStatus, string> = {
  silent: 'Meridian chose silence',
  candidates_suppressed: 'Candidates generated — none earned delivery',
  would_send: 'Interruption earned',
};

const STATUS_SUBLINE: Record<NotificationSystemStatus, string> = {
  silent:
    'No notifications would send right now. That is often the intelligent outcome.',
  candidates_suppressed:
    'The pipeline ran, but suppression and caps withheld delivery. Review traces below.',
  would_send:
    'At least one bundle passed all gates. Still render-only in verification — nothing is sent.',
};

export function NotificationSilenceReasonsSection({
  reasons,
  systemStatus,
  wouldSendCount,
  generatedCount,
}: NotificationSilenceReasonsSectionProps) {
  const styles = useStyles();

  return (
    <View style={styles.wrap}>
      <Text variant="callout" color="ink" style={styles.title}>
        Silence reasons
      </Text>
      <Text variant="subhead" color="inkSecondary" maxFontSizeMultiplier={1.08}>
        {STATUS_HEADLINE[systemStatus]}
      </Text>
      <Text variant="footnote" color="inkGhost" maxFontSizeMultiplier={1.05}>
        {STATUS_SUBLINE[systemStatus]}
      </Text>
      {generatedCount === 0 && wouldSendCount === 0 ? (
        <Text variant="footnote" color="inkSecondary" style={styles.clarifier}>
          Zeros here mean earned silence — not a broken pipeline.
        </Text>
      ) : null}
      <View style={styles.list}>
        {reasons.map((reason) => (
          <View key={reason} style={styles.bulletRow}>
            <Text variant="footnote" color="inkTertiary" style={styles.bullet}>
              •
            </Text>
            <Text variant="footnote" color="inkSecondary" style={styles.reason}>
              {reason}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: {
    gap: spacing[2],
    padding: spacing[4],
    backgroundColor: c.surfaceMuted,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.borderSubtle,
  },
  title: {
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
  clarifier: {
    fontStyle: 'italic' as const,
  },
  list: {
    marginTop: spacing[1],
    gap: spacing[2],
  },
  bulletRow: {
    flexDirection: 'row' as const,
    gap: spacing[2],
    alignItems: 'flex-start' as const,
  },
  bullet: {
    lineHeight: 18,
  },
  reason: {
    flex: 1,
    lineHeight: 18,
  },
}));
