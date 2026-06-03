import { Pressable, View } from 'react-native';

import { GradientCard } from '@/components/shared/surfaces/GradientCard';
import { DomainBadge } from '@/components/shared/primitives/DomainBadge';
import { domainColorFor } from '@/components/calendar/planEventAccent';
import { Text } from '@/components/typography/Text';
import type { MeridianCalendarEvent } from '@/types/calendar';
import { useTheme } from '@/hooks/useTheme';
import { makeStyles, spacing } from '@/theme';

type PlanEventCardProps = {
  event: MeridianCalendarEvent;
  onViewDetail: (event: MeridianCalendarEvent) => void;
  onEdit: (event: MeridianCalendarEvent) => void;
};

export function PlanEventCard({ event, onViewDetail, onEdit }: PlanEventCardProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const accentColor = domainColorFor(colors, event.inferredLifeDomain);

  return (
    <GradientCard accentColor={accentColor} style={styles.cardOverride}>
      <View style={styles.row}>
        <View style={styles.badgeWrap}>
          <DomainBadge domain={event.inferredLifeDomain} variant="dot" size="sm" />
        </View>
        <View style={styles.content}>
          <Text
            variant="subhead"
            color="ink"
            numberOfLines={2}
            maxFontSizeMultiplier={1.15}
          >
            {event.displayTitle ?? event.title}
          </Text>
          <View style={styles.metaRow}>
            <Text
              variant="footnote"
              style={styles.source}
              numberOfLines={1}
              maxFontSizeMultiplier={1.05}
              accessibilityLabel={`Calendar context ${event.planAttributionLine ?? event.displaySourceLabel}`}
            >
              {event.planAttributionLine ?? event.displaySourceLabel}
            </Text>
            <Text variant="footnote" style={styles.timeSep} maxFontSizeMultiplier={1.0}>
              ·
            </Text>
            <Text variant="footnote" style={styles.time} maxFontSizeMultiplier={1.05}>
              {event.allDay ? 'All day' : event.displayTime}
            </Text>
          </View>
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
    </GradientCard>
  );
}

const useStyles = makeStyles((c) => ({
  // GradientCard default padding is spacing[4]; keep it — slightly more spacious than before
  cardOverride: {
    gap: 0,
  },
  row: {
    flexDirection: 'row' as const,
    gap: spacing[3],
    alignItems: 'flex-start' as const,
  },
  badgeWrap: {
    paddingTop: 5,
  },
  content: {
    flex: 1,
    gap: spacing[1],
  },
  metaRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flexWrap: 'wrap' as const,
    gap: spacing[1],
  },
  time: {
    color: c.planEventTime,
  },
  timeSep: {
    color: c.inkGhost,
    opacity: 0.5,
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
    borderRadius: 6,
    borderWidth: 1,
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
