import { Calendar, ChevronRight, MapPin, Video } from 'lucide-react-native';
import { View } from 'react-native';

import { GradientCard } from '@/components/shared/surfaces/GradientCard';
import { TeamsLogo } from '@/components/shared/icons/TeamsLogo';
import { domainColorFor } from '@/components/calendar/planEventAccent';
import { Text } from '@/components/typography/Text';
import type { MeridianCalendarEvent } from '@/types/calendar';
import { useTheme } from '@/hooks/useTheme';
import { makeStyles, spacing } from '@/theme';

type PlanEventCardProps = {
  event: MeridianCalendarEvent;
  onViewDetail: (event: MeridianCalendarEvent) => void;
};

function formatDuration(start: Date, end: Date): string {
  const mins = Math.round((end.getTime() - start.getTime()) / 60000);
  if (mins <= 0) return '';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
}

/** True if the location string looks like a physical address rather than a URL or virtual tag. */
function isPhysicalLocation(location: string): boolean {
  if (!location) return false;
  const lower = location.toLowerCase();
  return !(
    lower.startsWith('http') ||
    lower.includes('zoom.us') ||
    lower.includes('meet.google') ||
    lower.includes('teams.microsoft') ||
    lower.includes('webex') ||
    lower.includes('gotomeeting')
  );
}

export function PlanEventCard({ event, onViewDetail }: PlanEventCardProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const accentColor = domainColorFor(colors, event.inferredLifeDomain);

  const duration =
    !event.allDay && event.startTime && event.endTime
      ? formatDuration(event.startTime, event.endTime)
      : null;

  const meetingUrl = event.meetingUrl;
  const meetingProvider: 'teams' | 'meet' | null = meetingUrl
    ? meetingUrl.includes('teams.microsoft.com')
      ? 'teams'
      : meetingUrl.includes('meet.google.com')
        ? 'meet'
        : null
    : null;

  const physicalLocation =
    !meetingUrl && event.location && isPhysicalLocation(event.location)
      ? event.location
      : null;

  return (
    <GradientCard
      accentColor={accentColor}
      style={styles.cardOverride}
      onPress={() => onViewDetail(event)}
      accessibilityRole="button"
    >
      <View style={styles.row}>
        {/* Calendar icon — left side */}
        <View style={styles.iconWrap}>
          <Calendar size={16} color={accentColor ?? colors.inkTertiary} strokeWidth={1.75} />
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

          {/* Time + duration */}
          <View style={styles.metaRow}>
            <Text variant="footnote" style={styles.time} maxFontSizeMultiplier={1.05}>
              {event.allDay ? 'All day' : event.displayTime}
            </Text>
            {duration ? (
              <>
                <Text variant="footnote" style={styles.sep} maxFontSizeMultiplier={1.0}>
                  ·
                </Text>
                <Text variant="footnote" style={styles.duration} maxFontSizeMultiplier={1.05}>
                  {duration}
                </Text>
              </>
            ) : null}
          </View>

          {/* Meeting type or location tag */}
          {meetingProvider ? (
            <View style={styles.tagRow}>
              {meetingProvider === 'teams' ? (
                <TeamsLogo size={12} />
              ) : (
                <Video size={13} color={colors.inkGhost} strokeWidth={1.75} />
              )}
              <Text variant="caption" style={styles.tagText} maxFontSizeMultiplier={1.0}>
                {meetingProvider === 'teams' ? 'Microsoft Teams' : 'Google Meet'}
              </Text>
            </View>
          ) : physicalLocation ? (
            <View style={styles.tagRow}>
              <MapPin size={13} color={colors.inkGhost} strokeWidth={1.75} />
              <Text
                variant="caption"
                style={styles.tagText}
                numberOfLines={1}
                maxFontSizeMultiplier={1.0}
              >
                {physicalLocation}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.chevronWrap}>
          <ChevronRight size={16} color={colors.inkGhost} strokeWidth={1.75} />
        </View>
      </View>
    </GradientCard>
  );
}

const useStyles = makeStyles((c) => ({
  cardOverride: {
    gap: 0,
    // HIG: surface contrast does the card separation — no visible border needed.
    // borderLeftWidth (the domain accent) is set by GradientCard via a separate
    // style key and is not affected by these overrides.
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  row: {
    flexDirection: 'row' as const,
    gap: spacing[3],
    alignItems: 'center' as const,
  },
  iconWrap: {
    alignSelf: 'flex-start' as const,
    marginTop: 2,
    width: 20,
    alignItems: 'center' as const,
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
  tagRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    marginTop: 1,
  },
  tagText: {
    color: c.inkGhost,
    flexShrink: 1,
  },
  time: {
    color: c.ink,
    fontWeight: '500' as const,
  },
  duration: {
    color: c.inkGhost,
  },
  sep: {
    color: c.inkGhost,
    opacity: 0.5,
  },
  chevronWrap: {
    alignSelf: 'center' as const,
  },
}));
