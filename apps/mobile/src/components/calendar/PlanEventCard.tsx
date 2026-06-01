import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/typography/Text';
import { planAccentForEventDomain } from '@/components/calendar/planEventAccent';
import type { MeridianCalendarEvent } from '@/types/calendar';
import { useTheme } from '@/hooks/useTheme';
import { makeStyles, radius, spacing } from '@/theme';

type PlanEventCardProps = {
  event: MeridianCalendarEvent;
  onViewDetail: (event: MeridianCalendarEvent) => void;
  onEdit: (event: MeridianCalendarEvent) => void;
};

export function PlanEventCard({
  event,
  onViewDetail,
  onEdit,
}: PlanEventCardProps) {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.dot,
          {
            backgroundColor: planAccentForEventDomain(
              colors,
              event.attribution?.inferredDomain ?? null,
              event.inferredCategory,
              event.inferredOwnerLabel,
            ),
          },
        ]}
        accessibilityElementsHidden
      />
      <View style={styles.content}>
        <Text
          variant="subhead"
          color="ink"
          numberOfLines={2}
          maxFontSizeMultiplier={1.15}
        >
          {event.displayTitle ?? event.title}
        </Text>
        <Text
          variant="footnote"
          style={styles.source}
          numberOfLines={1}
          maxFontSizeMultiplier={1.05}
          accessibilityLabel={`Calendar context ${event.planAttributionLine ?? event.displaySourceLabel}`}
        >
          {event.planAttributionLine ?? event.displaySourceLabel}
        </Text>
        <Text variant="footnote" style={styles.time} maxFontSizeMultiplier={1.05}>
          {event.allDay ? 'All day' : event.displayTime}
        </Text>
        <View style={styles.actions}>
          <Pressable
            onPress={() => onViewDetail(event)}
            style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
            accessibilityRole="button"
            accessibilityLabel={`View details for ${event.title}`}
            hitSlop={8}
          >
            <Text variant="footnote" style={styles.actionText}>
              Details
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onEdit(event)}
            style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${event.title}`}
            hitSlop={8}
          >
            <Text variant="footnote" style={styles.actionText}>
              Edit
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  row: {
    flexDirection: 'row' as const,
    gap: spacing[3],
    backgroundColor: c.planEventRow,
    borderRadius: radius.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderSubtle,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    marginTop: 8,
  },
  content: {
    flex: 1,
    gap: spacing[1],
  },
  time: {
    color: c.planEventTime,
  },
  source: {
    color: c.planEventSource,
    flexShrink: 1,
  },
  actions: {
    flexDirection: 'row' as const,
    gap: spacing[4],
    marginTop: spacing[2],
  },
  action: {
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderSubtle,
  },
  actionPressed: {
    backgroundColor: c.surfaceMuted,
  },
  actionText: {
    color: c.inkTertiary,
    letterSpacing: 0.2,
  },
}));
