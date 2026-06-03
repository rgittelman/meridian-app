import { View } from 'react-native';

import { domainColorFor } from '@/components/calendar/planEventAccent';
import { Text } from '@/components/typography/Text';
import { makeStyles, radius, spacing } from '@/theme';
import { useTheme } from '@/hooks/useTheme';
import type { LifeDomainId } from '@/types/life';

const BAR_MAX_HEIGHT = 52;
const BAR_MIN_HEIGHT = 4;

export type ActivityDay = {
  label: string;
  count: number;
  domain?: LifeDomainId;
  isToday: boolean;
};

type WeeklyActivityBarProps = {
  days: ActivityDay[];
};

export function WeeklyActivityBar({ days }: WeeklyActivityBarProps) {
  const { colors } = useTheme();
  const styles = useStyles();

  const maxCount = Math.max(...days.map((d) => d.count), 1);

  return (
    <View style={styles.row}>
      {days.map((day, i) => {
        const barHeight = Math.max(
          BAR_MIN_HEIGHT,
          Math.round((day.count / maxCount) * BAR_MAX_HEIGHT),
        );
        const barColor = day.domain
          ? domainColorFor(colors, day.domain)
          : colors.inkGhost;
        const opacity = day.isToday ? 1 : 0.65;

        return (
          <View key={i} style={styles.col}>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.bar,
                  {
                    height: barHeight,
                    backgroundColor: barColor,
                    opacity,
                  },
                ]}
              />
            </View>
            <Text
              variant="footnote"
              color={day.isToday ? 'inkSecondary' : 'inkGhost'}
              align="center"
              weight={day.isToday ? 'semibold' : 'regular'}
              style={styles.dayLabel}
            >
              {day.label}
            </Text>
            {day.isToday && (
              <View
                style={[styles.todayDot, { backgroundColor: barColor }]}
                accessibilityElementsHidden
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing[1] + 1,
  },
  col: {
    flex: 1,
    alignItems: 'center',
  },
  barTrack: {
    height: BAR_MAX_HEIGHT,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: radius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: c.borderSubtle,
  },
  bar: {
    width: '100%',
    borderRadius: radius.sm,
  },
  dayLabel: {
    marginTop: spacing[1],
    fontSize: 9,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
    opacity: 0.9,
  },
}));
