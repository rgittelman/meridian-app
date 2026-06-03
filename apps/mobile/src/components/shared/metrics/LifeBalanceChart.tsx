import { useMemo } from 'react';
import { View } from 'react-native';
import { Circle, Defs, LinearGradient, Stop, Svg } from 'react-native-svg';

import { domainColorFor } from '@/components/calendar/planEventAccent';
import { makeStyles, spacing } from '@/theme';
import { useTheme } from '@/hooks/useTheme';
import type { LifeDomainId } from '@/types/life';

const SIZE = 96;
const RADIUS = 36;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const STROKE_WIDTH = 10;
const GAP_DEGREES = 4;
const GAP_ARC = (GAP_DEGREES / 360) * CIRCUMFERENCE;

export type BalanceSegment = {
  domain: LifeDomainId;
  count: number;
};

type LifeBalanceChartProps = {
  segments: BalanceSegment[];
  size?: number;
};

export function LifeBalanceChart({ segments, size = SIZE }: LifeBalanceChartProps) {
  const { colors } = useTheme();
  const styles = useStyles();

  const scale = size / SIZE;
  const scaledRadius = RADIUS * scale;
  const scaledCenter = CENTER * scale;
  const scaledCircumference = 2 * Math.PI * scaledRadius;
  const scaledStroke = STROKE_WIDTH * scale;
  const scaledGap = (GAP_DEGREES / 360) * scaledCircumference;

  const activeSegments = segments.filter((s) => s.count > 0);
  const total = activeSegments.reduce((sum, s) => sum + s.count, 0);

  const arcs = useMemo(() => {
    if (total === 0 || activeSegments.length === 0) return [];

    const gapTotal = scaledGap * activeSegments.length;
    const available = scaledCircumference - gapTotal;

    let offset = 0;
    return activeSegments.map((seg) => {
      const arcLen = (seg.count / total) * available;
      const dashArray = `${arcLen} ${scaledCircumference - arcLen}`;
      const dashOffset = -(offset);
      offset += arcLen + scaledGap;
      return { ...seg, dashArray, dashOffset };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments, total, scaledCircumference, scaledGap]);

  const isEmpty = activeSegments.length === 0;

  return (
    <View style={styles.wrap} accessibilityLabel="Life balance chart">
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          {activeSegments.map((seg) => (
            <LinearGradient
              key={`grad-${seg.domain}`}
              id={`lbc-${seg.domain}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <Stop offset="0%" stopColor={domainColorFor(colors, seg.domain)} stopOpacity="1" />
              <Stop offset="100%" stopColor={domainColorFor(colors, seg.domain)} stopOpacity="0.65" />
            </LinearGradient>
          ))}
        </Defs>

        {/* Empty state track */}
        {isEmpty && (
          <Circle
            cx={scaledCenter}
            cy={scaledCenter}
            r={scaledRadius}
            stroke={colors.surfaceMuted}
            strokeWidth={scaledStroke}
            fill="none"
          />
        )}

        {/* Segments — each rotated to start from 12 o'clock */}
        {arcs.map((arc) => (
          <Circle
            key={arc.domain}
            cx={scaledCenter}
            cy={scaledCenter}
            r={scaledRadius}
            stroke={`url(#lbc-${arc.domain})`}
            strokeWidth={scaledStroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={arc.dashArray}
            strokeDashoffset={arc.dashOffset}
            transform={`rotate(-90 ${scaledCenter} ${scaledCenter})`}
          />
        ))}
      </Svg>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing[1],
  },
}));
