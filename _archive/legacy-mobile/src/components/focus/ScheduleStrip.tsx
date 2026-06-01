import { Calendar } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/typography/Text';
import { colors, radius, screenPaddingHorizontal, spacing } from '@/theme';

export type ScheduleItem = {
  id: string;
  label: string;
  time: string;
  /** Person name — shows initials avatar when set */
  person?: string;
  /** Whether this is an open/free window, not a commitment */
  isFree?: boolean;
};

/** Static sample items — replace with real calendar/commitment data */
const SAMPLE_SCHEDULE: ScheduleItem[] = [
  {
    id: 'sched-1',
    label: 'Board call',
    time: '3:00 PM',
  },
  {
    id: 'sched-2',
    label: 'Grace · Soccer',
    time: '4:00 PM',
    person: 'Grace',
  },
  {
    id: 'sched-3',
    label: 'Free window',
    time: 'After 6:00',
    isFree: true,
  },
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

type ScheduleChipProps = {
  item: ScheduleItem;
};

function ScheduleChip({ item }: ScheduleChipProps) {
  const initials = item.person ? getInitials(item.person) : null;
  const isFree = item.isFree ?? false;

  return (
    <View
      style={[styles.chip, isFree && styles.chipFree]}
      accessibilityLabel={`${item.label} at ${item.time}`}
    >
      {/* Avatar / icon */}
      <View style={[styles.avatar, isFree && styles.avatarFree]}>
        {initials ? (
          <Text variant="footnote" style={styles.initials} maxFontSizeMultiplier={1.0}>
            {initials}
          </Text>
        ) : (
          <Calendar
            size={13}
            color={isFree ? colors.success : colors.inkTertiary}
            strokeWidth={1.75}
          />
        )}
      </View>

      {/* Label + time */}
      <View style={styles.chipContent}>
        <Text
          variant="callout"
          color={isFree ? 'inkTertiary' : 'ink'}
          numberOfLines={1}
          maxFontSizeMultiplier={1.1}
          style={styles.chipLabel}
        >
          {item.label}
        </Text>
        <Text
          variant="footnote"
          color="inkTertiary"
          maxFontSizeMultiplier={1.0}
        >
          {item.time}
        </Text>
      </View>
    </View>
  );
}

type ScheduleStripProps = {
  items?: ScheduleItem[];
};

export function ScheduleStrip({ items = SAMPLE_SCHEDULE }: ScheduleStripProps) {
  return (
    <View style={styles.wrap}>
      <Text
        variant="caption"
        color="inkTertiary"
        style={[styles.sectionLabel, { paddingHorizontal: screenPaddingHorizontal }]}
        maxFontSizeMultiplier={1.1}
      >
        Coming up
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToAlignment="start"
        // Accessible: announce the list
        accessibilityRole="list"
        accessibilityLabel="Upcoming schedule"
      >
        {items.map((item) => (
          <ScheduleChip key={item.id} item={item} />
        ))}
        {/* Trailing spacer so last chip isn't clipped */}
        <View style={styles.trailingSpace} />
      </ScrollView>
    </View>
  );
}

const CHIP_HEIGHT = 70;

const styles = StyleSheet.create({
  wrap: {
    gap: spacing[3],
  },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  scrollContent: {
    paddingLeft: screenPaddingHorizontal,
    gap: spacing[2],
    alignItems: 'stretch',
  },
  trailingSpace: {
    width: screenPaddingHorizontal - spacing[2],
  },

  chip: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: spacing[2],
    backgroundColor: colors.scheduleCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    minWidth: 148,
    height: CHIP_HEIGHT,
    justifyContent: 'center',
  },
  chipFree: {
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceMuted,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.peoplePill,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
  },
  avatarFree: {
    backgroundColor: colors.successSoft,
  },
  chipContent: {
    gap: 2,
    paddingRight: 36, // make room for the absolute avatar
  },
  chipLabel: {
    fontWeight: '500',
  },
  initials: {
    color: colors.peoplePillText,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
  },
});
