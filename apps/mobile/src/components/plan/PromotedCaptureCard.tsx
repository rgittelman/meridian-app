import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/typography/Text';
import { formatPlanPeopleLine } from '@/services/plan/humanizePlanTitle';
import type { PlanPromotedCapture } from '@/types/plan';
import { makeStyles, radius, spacing } from '@/theme';

const ATTRIBUTION = 'From your captures';

type PromotedCaptureCardProps = {
  capture: PlanPromotedCapture;
  onPress?: (capture: PlanPromotedCapture) => void;
};

/**
 * Lightweight Plan intention row — lower visual weight than calendar events.
 * Hold / Handled live in PromotedCaptureDetailSheet, not on the timeline.
 */
export function PromotedCaptureCard({ capture, onPress }: PromotedCaptureCardProps) {
  const styles = useStyles();
  const isHeld = capture.status === 'held';
  const peopleLine =
    formatPlanPeopleLine(capture.inferredPeople) ?? capture.personLabel ?? null;

  const content = (
    <>
      <View style={styles.marker} accessibilityElementsHidden />
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
            style={styles.location}
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
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={() => onPress(capture)}
        style={({ pressed }) => [
          styles.row,
          isHeld && styles.rowHeld,
          pressed && styles.rowPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${capture.title}. ${peopleLine ? `${peopleLine}. ` : ''}${ATTRIBUTION}. ${capture.displayTime}`}
        accessibilityHint="Opens details"
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      style={[styles.row, isHeld && styles.rowHeld]}
      accessibilityRole="text"
      accessibilityLabel={`${capture.title}. ${ATTRIBUTION}. ${capture.displayTime}`}
    >
      {content}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  row: {
    flexDirection: 'row' as const,
    gap: spacing[2],
    backgroundColor: c.planCaptureRow,
    borderRadius: radius.sm,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.planCaptureBorder,
    borderStyle: 'dashed' as const,
    opacity: 0.92,
  },
  rowHeld: {
    opacity: 0.65,
  },
  rowPressed: {
    backgroundColor: c.surfaceMuted,
  },
  marker: {
    width: 5,
    height: 5,
    borderRadius: radius.full,
    marginTop: 6,
    backgroundColor: c.planCaptureMarker,
    opacity: 0.65,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  people: {
    color: c.peoplePillText,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
  title: {
    lineHeight: 20,
  },
  location: {
    marginTop: 1,
  },
  metaRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flexWrap: 'wrap' as const,
    gap: spacing[1],
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
