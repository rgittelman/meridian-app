import { Calendar } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/typography/Text';
import { ConnectCalendarCard } from '@/components/calendar/ConnectCalendarCard';
import { CalendarContinuityBanner } from '@/components/calendar/CalendarContinuityBanner';
import type { CalendarConnectionStatus } from '@/types/calendar';
import { useTheme } from '@/hooks/useTheme';
import { makeStyles, radius, screenPaddingHorizontal, spacing } from '@/theme';

export type ScheduleItem = {
  id: string;
  label: string;
  time: string;
  person?: string;
  isFree?: boolean;
};

function getInitials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

type ScheduleChipProps = { item: ScheduleItem };

function ScheduleChip({ item }: ScheduleChipProps) {
  const { colors } = useTheme();
  const styles = useChipStyles();
  const initials = item.person ? getInitials(item.person) : null;
  const isFree = item.isFree ?? false;

  return (
    <View
      style={[styles.chip, isFree && styles.chipFree]}
      accessibilityLabel={`${item.label} at ${item.time}`}
    >
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
        <Text variant="footnote" color="inkTertiary" maxFontSizeMultiplier={1.0}>
          {item.time}
        </Text>
      </View>
    </View>
  );
}

type ScheduleStripProps = {
  items?: ScheduleItem[];
  status?: CalendarConnectionStatus;
  configured?: boolean;
  onConnect?: () => void;
  connecting?: boolean;
  continuityHint?: string | null;
};

export function ScheduleStrip({
  items = [],
  status = 'not_connected',
  configured = true,
  onConnect,
  connecting = false,
  continuityHint,
}: ScheduleStripProps) {
  const padH = screenPaddingHorizontal;

  const showConnect =
    configured &&
    onConnect &&
    (status === 'not_connected' || status === 'token_expired' || status === 'auth_failed');

  const showUpcoming =
    items.length > 0 &&
    (status === 'connected' || status === 'partial_sync' || status === 'offline');

  const showEmptyConnected =
    items.length === 0 &&
    (status === 'connected' || status === 'partial_sync') &&
    !showConnect;

  const showLoading = status === 'loading' && items.length === 0;

  return (
    <View style={staticStyles.wrap}>
      <Text
        variant="caption"
        color="inkTertiary"
        style={[staticStyles.sectionLabel, { paddingHorizontal: padH }]}
        maxFontSizeMultiplier={1.1}
      >
        Coming up
      </Text>

      {continuityHint && (
        <View style={{ paddingHorizontal: padH }}>
          <CalendarContinuityBanner message={continuityHint} />
        </View>
      )}

      {showLoading && (
        <View style={{ paddingHorizontal: padH }}>
          <Text variant="callout" color="inkTertiary" maxFontSizeMultiplier={1.1}>
            Checking your schedule…
          </Text>
        </View>
      )}

      {showConnect && (
        <View style={{ paddingHorizontal: padH }}>
          <ConnectCalendarCard onConnect={onConnect} loading={connecting} compact />
        </View>
      )}

      {!configured && (
        <View style={{ paddingHorizontal: padH }}>
          <Text variant="callout" color="inkTertiary" maxFontSizeMultiplier={1.1}>
            Connect calendar to see what&apos;s ahead.
          </Text>
        </View>
      )}

      {showEmptyConnected && (
        <View style={{ paddingHorizontal: padH }}>
          <Text variant="callout" color="inkTertiary" maxFontSizeMultiplier={1.1}>
            Nothing urgent coming up.
          </Text>
        </View>
      )}

      {showUpcoming && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={staticStyles.scrollContent}
          decelerationRate="fast"
          snapToAlignment="start"
          accessibilityRole="list"
          accessibilityLabel="Upcoming schedule"
        >
          {items.map((item) => (
            <ScheduleChip key={item.id} item={item} />
          ))}
          <View style={staticStyles.trailingSpace} />
        </ScrollView>
      )}
    </View>
  );
}

const useChipStyles = makeStyles((c) => ({
  chip: {
    flexDirection: 'column' as const,
    alignItems: 'flex-start' as const,
    gap: spacing[2],
    backgroundColor: c.scheduleCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    minWidth: 148,
    height: 70,
    justifyContent: 'center' as const,
  },
  chipFree: {
    borderColor: c.borderSubtle,
    backgroundColor: c.surfaceMuted,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: c.peoplePill,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    position: 'absolute' as const,
    top: spacing[3],
    right: spacing[3],
  },
  avatarFree: {
    backgroundColor: c.successSoft,
  },
  chipContent: {
    gap: 2,
    paddingRight: 36,
  },
  chipLabel: {
    fontWeight: '500' as const,
  },
  initials: {
    color: c.peoplePillText,
    fontSize: 11,
    fontWeight: '600' as const,
    lineHeight: 14,
  },
}));

const staticStyles = StyleSheet.create({
  wrap: { gap: spacing[3] },
  sectionLabel: { letterSpacing: 0.3 },
  scrollContent: {
    paddingLeft: screenPaddingHorizontal,
    gap: spacing[2],
    alignItems: 'stretch' as const,
  },
  trailingSpace: { width: screenPaddingHorizontal - spacing[2] },
});
