import { View } from 'react-native';

import { GradientCard } from '@/components/shared/surfaces/GradientCard';
import { DomainBadge } from '@/components/shared/primitives/DomainBadge';
import { domainColorFor } from '@/components/calendar/planEventAccent';
import { Text } from '@/components/typography/Text';
import { formatPlanPeopleLine } from '@/services/plan/humanizePlanTitle';
import type { PlanPromotedCapture } from '@/types/plan';
import { useTheme } from '@/hooks/useTheme';
import { makeStyles, spacing } from '@/theme';

const ATTRIBUTION = 'From your captures';

type PromotedCaptureCardProps = {
  capture: PlanPromotedCapture;
  onPress?: (capture: PlanPromotedCapture) => void;
};

/**
 * Capture intention row on the Plan timeline.
 * Visually distinct from calendar events: surfaceMuted background (vs surfaceElevated),
 * domain-colored accent border, DomainBadge dot. Lower visual weight — intentional.
 * Hold / Handled live in PromotedCaptureDetailSheet.
 */
export function PromotedCaptureCard({ capture, onPress }: PromotedCaptureCardProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const isHeld = capture.status === 'held';
  const accentColor = domainColorFor(colors, capture.inferredDomain);
  const peopleLine =
    formatPlanPeopleLine(capture.inferredPeople) ?? capture.personLabel ?? null;

  const inner = (
    <View style={styles.row}>
      <View style={styles.badgeWrap}>
        <DomainBadge domain={capture.inferredDomain} variant="dot" size="sm" />
      </View>
      <View style={styles.content}>
        {peopleLine ? (
          <Text
            variant="caption"
            style={styles.people}
            numberOfLines={1}
            maxFontSizeMultiplier={1.05}
          >
            {peopleLine}
          </Text>
        ) : null}
        <Text
          variant="callout"
          color="inkSecondary"
          style={styles.title}
          numberOfLines={2}
          maxFontSizeMultiplier={1.12}
        >
          {capture.title}
        </Text>
        {capture.location ? (
          <Text
            variant="caption"
            color="inkGhost"
            numberOfLines={1}
            maxFontSizeMultiplier={1.05}
          >
            {capture.location}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          <Text
            variant="caption"
            style={styles.source}
            numberOfLines={1}
            maxFontSizeMultiplier={1.0}
          >
            {ATTRIBUTION}
          </Text>
          <Text variant="caption" style={styles.metaDot} maxFontSizeMultiplier={1.0}>
            ·
          </Text>
          <Text variant="caption" style={styles.time} maxFontSizeMultiplier={1.0}>
            {capture.displayTime}
            {capture.isApproximate ? ' ~' : ''}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <GradientCard
      accentColor={accentColor}
      onPress={onPress ? () => onPress(capture) : undefined}
      accessibilityRole={onPress ? 'button' : 'text'}
      style={[
        styles.cardOverride,
        isHeld && styles.cardHeld,
      ]}
    >
      {inner}
    </GradientCard>
  );
}

const useStyles = makeStyles((c) => ({
  // surfaceMuted background distinguishes captures from calendar events (surfaceElevated)
  cardOverride: {
    backgroundColor: c.surfaceMuted,
    padding: spacing[3],
  },
  cardHeld: {
    opacity: 0.6,
  },
  row: {
    flexDirection: 'row' as const,
    gap: spacing[2],
    alignItems: 'flex-start' as const,
  },
  badgeWrap: {
    paddingTop: 5,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  people: {
    color: c.peoplePillText,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
  title: {
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flexWrap: 'wrap' as const,
    gap: spacing[1],
    marginTop: 2,
  },
  time: {
    color: c.planCaptureTime,
  },
  source: {
    color: c.planCaptureSource,
    flexShrink: 1,
  },
  metaDot: {
    color: c.inkGhost,
    opacity: 0.5,
  },
}));
