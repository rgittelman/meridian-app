import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/typography/Text';
import {
  auditCaptureIntelligence,
  type CaptureIntelligenceAudit,
} from '@/services/capture/captureIntelligenceAudit';
import type { LifeObject } from '@/types/capture';
import { isDevEnvironment } from '@/utils/isDev';
import { makeStyles, radius, spacing } from '@/theme';

type CaptureIntelligenceDiagnosticsProps = {
  item: LifeObject;
  audit?: CaptureIntelligenceAudit;
  compact?: boolean;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={staticStyles.row}>
      <Text variant="caption" color="inkGhost" style={staticStyles.label} maxFontSizeMultiplier={1.0}>
        {label}
      </Text>
      <Text variant="caption" color="inkSecondary" style={staticStyles.value} maxFontSizeMultiplier={1.0}>
        {value}
      </Text>
    </View>
  );
}

function formatAuditSummary(audit: CaptureIntelligenceAudit): string {
  if (audit.promotionEligible && audit.propagatedToPlan) {
    return `Promoted → Plan (${audit.inferredDomain}), Life, ${audit.parsedTime ?? 'timing TBD'}`;
  }
  if (audit.promotionEligible) {
    return `Eligible but not placed (${audit.eligibilityReason ?? 'unknown'})`;
  }
  return `Not promoted: ${audit.promotionRejectionReason ?? audit.eligibilityReason ?? 'unknown'}`;
}

export function CaptureIntelligenceDiagnostics({
  item,
  audit: auditProp,
  compact = false,
}: CaptureIntelligenceDiagnosticsProps) {
  const styles = useStyles();

  if (!isDevEnvironment()) return null;

  const audit = auditProp ?? auditCaptureIntelligence(item);

  if (compact) {
    return (
      <View style={styles.compactWrap}>
        <Text variant="caption" style={styles.compactSummary} maxFontSizeMultiplier={1.0}>
          {formatAuditSummary(audit)}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap} accessibilityLabel="Capture promotion diagnostics">
      <Text variant="caption" style={styles.heading} maxFontSizeMultiplier={1.05}>
        Capture intelligence (dev)
      </Text>
      <Text variant="caption" style={styles.summary} maxFontSizeMultiplier={1.05}>
        {formatAuditSummary(audit)}
      </Text>
      <Row label="parsedDate" value={audit.parsedDate ?? '—'} />
      <Row label="parsedTime" value={audit.parsedTime ?? '—'} />
      <Row label="parsedLocation" value={audit.parsedLocation ?? '—'} />
      <Row label="inferredDomain" value={`${audit.inferredDomain} (${audit.domainReason})`} />
      <Row
        label="inferredPeople"
        value={audit.inferredPeople.length > 0 ? audit.inferredPeople.join(', ') : '—'}
      />
      <Row label="timingConfidence" value={audit.timingConfidence} />
      <Row label="timingLabel" value={audit.timingLabel ?? '—'} />
      <Row label="planTitle" value={audit.planTitle} />
      <Row label="promotionEligible" value={audit.promotionEligible ? 'yes' : 'no'} />
      <Row
        label="promotionRejectionReason"
        value={audit.promotionRejectionReason ?? '—'}
      />
      <Row label="propagatedToPlan" value={audit.propagatedToPlan ? 'yes' : 'no'} />
      <Row label="propagatedToLife" value={audit.propagatedToLife ? 'yes' : 'no'} />
      <Row
        label="propagatedToFocus"
        value={
          audit.propagatedToFocus
            ? `yes (boost ${audit.focusBoost.toFixed(2)})`
            : audit.hoursUntilStart != null
              ? `no (${Math.round(audit.hoursUntilStart)}h until start)`
              : 'no'
        }
      />
      <Row label="createsCalendarEvent" value="no" />
    </View>
  );
}

const staticStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing[2],
    alignItems: 'flex-start',
  },
  label: {
    width: 168,
    flexShrink: 0,
  },
  value: {
    flex: 1,
  },
});

const useStyles = makeStyles((c) => ({
  wrap: {
    gap: spacing[1],
    padding: spacing[3],
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderSubtle,
    borderStyle: 'dashed',
    backgroundColor: c.surfaceMuted,
  },
  heading: {
    fontWeight: '600',
    color: c.inkSecondary,
    marginBottom: spacing[1],
  },
  summary: {
    color: c.inkTertiary,
    marginBottom: spacing[2],
  },
  compactWrap: {
    marginTop: spacing[1],
  },
  compactSummary: {
    color: c.inkGhost,
    fontStyle: 'italic',
  },
}));
