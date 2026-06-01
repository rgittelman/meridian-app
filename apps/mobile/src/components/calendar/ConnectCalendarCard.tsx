import { Calendar } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/typography/Text';
import { useTheme } from '@/hooks/useTheme';
import { makeStyles, minTouchTarget, radius, spacing } from '@/theme';

type ConnectCalendarCardProps = {
  onConnect: () => void;
  loading?: boolean;
  compact?: boolean;
};

export function ConnectCalendarCard({
  onConnect,
  loading = false,
  compact = false,
}: ConnectCalendarCardProps) {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <Pressable
      onPress={onConnect}
      disabled={loading}
      style={({ pressed }) => [
        styles.card,
        compact && styles.cardCompact,
        pressed && styles.cardPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Connect Google Calendar. See your real week in one place."
      accessibilityState={{ disabled: loading, busy: loading }}
    >
      <View style={styles.iconWrap}>
        <Calendar size={compact ? 16 : 18} color={colors.accent} strokeWidth={1.75} />
      </View>
      <View style={styles.copy}>
        <Text
          variant={compact ? 'callout' : 'subhead'}
          color="ink"
          maxFontSizeMultiplier={1.15}
        >
          {loading ? 'Connecting…' : 'Connect Google Calendar'}
        </Text>
        {!compact && (
          <Text variant="footnote" color="inkTertiary" maxFontSizeMultiplier={1.1}>
            See your real week in one place.
          </Text>
        )}
        {!compact && (
          <Text variant="footnote" style={styles.hint} maxFontSizeMultiplier={1.05}>
            Meridian uses your calendar to understand timing, not to overwhelm you.
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  card: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: spacing[3],
    backgroundColor: c.calendarConnectBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.calendarConnectBorder,
    borderRadius: radius.lg,
    padding: spacing[4],
    minHeight: minTouchTarget,
  },
  cardCompact: {
    alignItems: 'center' as const,
    paddingVertical: spacing[3],
  },
  cardPressed: { opacity: 0.88 },
  iconWrap: {
    paddingTop: 2,
  },
  copy: {
    flex: 1,
    gap: spacing[1],
  },
  hint: {
    color: c.calendarContinuityText,
    marginTop: spacing[1],
  },
}));
