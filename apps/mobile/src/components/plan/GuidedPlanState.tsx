import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/typography/Text';
import { useTheme } from '@/hooks/useTheme';
import { makeStyles, radius, spacing } from '@/theme';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;

function getTodayWeekdayIndex(): number {
  const d = new Date().getDay();
  if (d === 0 || d === 6) return 2;
  return d - 1;
}

type DotState = 'past' | 'today' | 'future';

function WeekDot({ state }: { state: DotState }) {
  const styles = useDotStyles();
  return (
    <View
      style={[
        styles.dot,
        state === 'today' && styles.dotToday,
        state === 'past' && styles.dotPast,
        state === 'future' && styles.dotFuture,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}

export function GuidedPlanState() {
  const styles = useStyles();
  const todayIdx = getTodayWeekdayIndex();

  return (
    <View style={styles.wrap} accessibilityLabel="Plan. This week still has breathing room.">
      <Text variant="caption" color="inkGhost" style={styles.eyebrow}>
        This week
      </Text>

      <Text variant="display" color="ink" style={styles.headline}>
        This week still has breathing room.
      </Text>

      <Text variant="body" color="inkSecondary" style={styles.subline}>
        You don't need to plan everything tonight.
      </Text>

      <View style={styles.week} accessibilityLabel="Week overview">
        {WEEKDAYS.map((day, idx) => {
          const state: DotState =
            idx < todayIdx ? 'past' : idx === todayIdx ? 'today' : 'future';
          return (
            <View
              key={day}
              style={styles.weekDay}
              accessibilityLabel={idx === todayIdx ? `${day}, today` : day}
            >
              <WeekDot state={state} />
              <Text
                variant="footnote"
                style={[
                  styles.weekLabel,
                  state === 'today' && styles.weekLabelToday,
                  state === 'past' && styles.weekLabelPast,
                ]}
                maxFontSizeMultiplier={1.1}
              >
                {day}
              </Text>
            </View>
          );
        })}
      </View>

      <View
        style={styles.divider}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />

      <Text variant="callout" color="inkGhost" style={styles.footer}>
        Things become clearer as they get closer.
      </Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: {
    flex: 1,
    justifyContent: 'center' as const,
    paddingBottom: spacing[10],
    gap: spacing[4],
  },
  eyebrow: { letterSpacing: 0.4, marginBottom: -spacing[1] },
  headline: { maxWidth: 300 },
  subline: { maxWidth: 280, marginTop: -spacing[1] },
  week: {
    flexDirection: 'row' as const,
    marginTop: spacing[4],
    marginBottom: spacing[1],
  },
  weekDay: {
    flex: 1,
    alignItems: 'center' as const,
    gap: spacing[2],
  },
  weekLabel: {
    color: c.inkGhost,
    opacity: 0.45,
  },
  weekLabelToday: {
    color: c.inkSecondary,
    opacity: 1,
  },
  weekLabelPast: { opacity: 0.3 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
    marginTop: spacing[2],
    marginBottom: spacing[1],
  },
  footer: { maxWidth: 264 },
}));

const useDotStyles = makeStyles((c) => ({
  dot: { width: 6, height: 6, borderRadius: radius.full },
  dotToday: { width: 9, height: 9, backgroundColor: c.ringProgress },
  dotPast: { backgroundColor: c.inkGhost, opacity: 0.3 },
  dotFuture: { backgroundColor: c.inkGhost, opacity: 0.16 },
}));
