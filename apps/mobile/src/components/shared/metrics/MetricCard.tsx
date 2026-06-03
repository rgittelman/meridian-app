import { View } from 'react-native';

import { GradientCard } from '@/components/shared/surfaces/GradientCard';
import { Text } from '@/components/typography/Text';
import { makeStyles, spacing } from '@/theme';

export type MetricTrend = 'up' | 'down' | 'flat';

type MetricCardProps = {
  label: string;
  value: string | number;
  unit?: string;
  trend?: MetricTrend;
  accentColor?: string;
  onPress?: () => void;
};

const TREND_SYMBOL: Record<MetricTrend, string> = {
  up:   '↑',
  down: '↓',
  flat: '→',
};

export function MetricCard({ label, value, unit, trend, accentColor, onPress }: MetricCardProps) {
  const styles = useStyles();

  return (
    <GradientCard accentColor={accentColor} onPress={onPress}>
      <Text variant="caption" color="inkTertiary" weight="medium">
        {label}
      </Text>
      <View style={styles.valueRow}>
        <Text variant="title" color="ink" weight="bold">
          {String(value)}
        </Text>
        {unit ? (
          <Text variant="callout" color="inkSecondary" style={styles.unit}>
            {unit}
          </Text>
        ) : null}
        {trend ? (
          <Text
            variant="callout"
            style={[styles.trend, trendStyle(trend)]}
            weight="medium"
          >
            {TREND_SYMBOL[trend]}
          </Text>
        ) : null}
      </View>
    </GradientCard>
  );
}

function trendStyle(trend: MetricTrend): { color: string } {
  switch (trend) {
    case 'up':   return { color: '#10B981' };
    case 'down': return { color: '#F59E0B' };
    case 'flat': return { color: '#6B6485' };
  }
}

const useStyles = makeStyles(() => ({
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: spacing[1],
    gap: spacing[1],
  },
  unit: {
    marginBottom: 2,
  },
  trend: {
    marginBottom: 2,
  },
}));
