import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Circle, Defs, LinearGradient, Stop, Svg } from 'react-native-svg';

import { Text } from '@/components/typography/Text';
import { useTheme } from '@/hooks/useTheme';
import { makeStyles, spacing } from '@/theme';

const SVG_SIZE = 228;
const CENTER = SVG_SIZE / 2;
const RING_RADIUS = 88;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const TRACK_WIDTH = 3;
const GLOW_WIDTH = 16;
const PROGRESS_WIDTH = 9;
const ATMOSPHERE_RADIUS = RING_RADIUS + 11;
const ATMOSPHERE_WIDTH = 24;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type MomentumRingProps = {
  progress?: number;
  momentumLabel?: string;
  dayLabel?: string;
};

export function MomentumRing({
  progress = 0.65,
  momentumLabel = 'Steady',
  dayLabel = 'Today',
}: MomentumRingProps) {
  const { colors } = useTheme();
  const styles = useStyles();

  const dashOffset = useMemo(
    () => CIRCUMFERENCE * (1 - progress),
    [progress],
  );

  return (
    <View style={styles.wrap}>
      <View
        style={styles.glowHalo}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />

      <Svg
        width={SVG_SIZE}
        height={SVG_SIZE}
        viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
        accessibilityLabel={`Momentum: ${momentumLabel}. ${Math.round(progress * 100)}% through today.`}
      >
        <Defs>
          <LinearGradient id="arcWarm" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colors.ringGradientStart} stopOpacity="0.82" />
            <Stop offset="100%" stopColor={colors.ringGradientEnd} stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* Atmosphere — very faint outer warmth halo */}
        <Circle
          cx={CENTER}
          cy={CENTER}
          r={ATMOSPHERE_RADIUS}
          stroke={colors.ringProgress}
          strokeWidth={ATMOSPHERE_WIDTH}
          strokeOpacity={0.028}
          fill="none"
        />

        {/* Track — thin warm-stone full circle */}
        <Circle
          cx={CENTER}
          cy={CENTER}
          r={RING_RADIUS}
          stroke={colors.ringTrack}
          strokeWidth={TRACK_WIDTH}
          fill="none"
          strokeLinecap="round"
        />

        {/* Glow layer — soft warm bloom behind the progress arc */}
        <AnimatedCircle
          cx={CENTER}
          cy={CENTER}
          r={RING_RADIUS}
          stroke={colors.ringProgress}
          strokeWidth={GLOW_WIDTH}
          strokeOpacity={0.14}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${CENTER} ${CENTER})`}
        />

        {/* Progress arc — warm amber gradient, 12 o'clock origin */}
        <Circle
          cx={CENTER}
          cy={CENTER}
          r={RING_RADIUS}
          stroke="url(#arcWarm)"
          strokeWidth={PROGRESS_WIDTH}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${CENTER} ${CENTER})`}
        />
      </Svg>

      <View style={styles.center} pointerEvents="none">
        <Text
          variant="caption"
          color="inkGhost"
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
          maxFontSizeMultiplier={1.15}
        >
          {momentumLabel}
        </Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: spacing[4],
  },
  glowHalo: {
    position: 'absolute' as const,
    width: SVG_SIZE * 0.76,
    height: SVG_SIZE * 0.76,
    borderRadius: SVG_SIZE,
    backgroundColor: c.ringGlow,
  },
  center: {
    position: 'absolute' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing[1],
  },
  dayLabel: {
    letterSpacing: 0.8,
  },
}));
