import { View } from 'react-native';

import { Text } from '@/components/typography/Text';
import { useTheme } from '@/hooks/useTheme';
import type { NotificationVerificationTrace } from '@/types/notification';
import { makeStyles, spacing } from '@/theme';

type NotificationDecisionTraceProps = {
  trace: NotificationVerificationTrace;
};

const STAGE_LABELS: Record<string, string> = {
  generated: 'Candidate Generated',
  constitutional_check: 'Constitutional Check',
  suppression: 'Suppression',
  bundling: 'Bundling',
  daily_caps: 'Daily Caps',
};

export function NotificationDecisionTrace({ trace }: NotificationDecisionTraceProps) {
  const { colors } = useTheme();
  const styles = useStyles();

  const outcomeColor = (outcome: string) => {
    if (outcome === 'pass') return colors.success;
    if (outcome === 'fail') return colors.warning ?? colors.inkSecondary;
    return colors.inkGhost;
  };

  return (
    <View style={styles.wrap}>
      <Text variant="footnote" color="inkSecondary" style={styles.typeLabel}>
        {trace.typeLabel}
      </Text>
      {trace.steps.map((step) => (
        <View key={step.stage} style={styles.step}>
          <Text variant="caption" color="inkGhost">
            {STAGE_LABELS[step.stage] ?? step.stage}
          </Text>
          <Text
            variant="footnote"
            style={[styles.outcome, { color: outcomeColor(step.outcome) }]}
            maxFontSizeMultiplier={1.05}
          >
            {step.outcome === 'pass'
              ? step.detail?.includes('PASS')
                ? step.detail
                : 'PASS'
              : step.outcome === 'fail'
                ? step.detail ?? 'FAIL'
                : step.detail ?? 'Skipped'}
          </Text>
        </View>
      ))}
      <View style={styles.decisionRow}>
        <Text variant="caption" color="inkGhost">
          Decision
        </Text>
        <Text
          variant="subhead"
          style={[
            styles.finalDecision,
            {
              color:
                trace.finalDecision === 'approved' ? colors.success : colors.inkSecondary,
            },
          ]}
        >
          {trace.finalDecision === 'approved' ? 'APPROVED' : 'SUPPRESSED'}
        </Text>
        {trace.finalReason ? (
          <Text variant="footnote" color="inkGhost" maxFontSizeMultiplier={1.05}>
            {trace.finalReason}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: {
    gap: spacing[2],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    backgroundColor: c.surfaceMuted,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.borderSubtle,
  },
  typeLabel: {
    fontWeight: '600' as const,
  },
  step: {
    gap: 2,
    paddingLeft: spacing[2],
    borderLeftWidth: 2,
    borderLeftColor: c.borderSubtle,
  },
  outcome: {
    fontWeight: '500' as const,
  },
  decisionRow: {
    marginTop: spacing[2],
    gap: spacing[1],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: c.borderSubtle,
  },
  finalDecision: {
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },
}));
