import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Circle, Svg } from 'react-native-svg';

import { Text } from '@/components/typography/Text';
import { colors, spacing } from '@/theme';

// Ring geometry
const SVG_SIZE = 200;
const CENTER = SVG_SIZE / 2;
const RING_RADIUS = 80;
const TRACK_WIDTH = 5;
const PROGRESS_WIDTH = 5;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * Prepare for Reanimated animation:
 * AnimatedCircle will allow strokeDashoffset to be driven by a shared value.
 * Currently renders static; animation hook can be dropped in later.
 */
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type MomentumRingProps = {
  /**
   * 0–1 progress value. Drives the arc fill.
   * Future: driven by useSharedValue for animated ring.
   */
  progress?: number;
  /** Center label — short emotional state word */
  momentumLabel?: string;
  /** Day label above the momentum word */
  dayLabel?: string;
};

export function MomentumRing({
  progress = 0.65,
  momentumLabel = 'Steady',
  dayLabel = 'Today',
}: MomentumRingProps) {
  const dashOffset = useMemo(
    () => CIRCUMFERENCE * (1 - progress),
    [progress],
  );

  return (
    <View style={styles.wrap}>
      {/* Subtle ambient glow behind ring — very restrained */}
      <View style={styles.glowHalo} accessibilityElementsHidden importantForAccessibility="no" />

      <Svg
        width={SVG_SIZE}
        height={SVG_SIZE}
        viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
        accessibilityLabel={`Momentum ring: ${momentumLabel}. ${Math.round(progress * 100)}% progress today.`}
      >
        {/* Track — full circle, very faint */}
        <Circle
          cx={CENTER}
          cy={CENTER}
          r={RING_RADIUS}
          stroke={colors.ringTrack}
          strokeWidth={TRACK_WIDTH}
          fill="none"
          strokeLinecap="round"
        />

        {/* Progress arc — starts at 12 o'clock (-90° rotation) */}
        <AnimatedCircle
          cx={CENTER}
          cy={CENTER}
          r={RING_RADIUS}
          stroke={colors.ringProgress}
          strokeWidth={PROGRESS_WIDTH}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${CENTER} ${CENTER})`}
        />
      </Svg>

      {/* Center labels — absolute over SVG */}
      <View style={styles.center} pointerEvents="none">
        <Text
          variant="caption"
          color="inkTertiary"
          align="center"
          style={styles.dayLabel}
          maxFontSizeMultiplier={1.1}
        >
          {dayLabel}
        </Text>
        <Text
          variant="heading"
          color="ink"
          align="center"
          style={styles.momentumLabel}
          maxFontSizeMultiplier={1.15}
        >
          {momentumLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
  },
  glowHalo: {
    position: 'absolute',
    width: SVG_SIZE * 0.85,
    height: SVG_SIZE * 0.85,
    borderRadius: SVG_SIZE,
    backgroundColor: colors.ringGlow,
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
  },
  dayLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  momentumLabel: {
    // Slightly heavier feel — inherit from heading token
  },
});
