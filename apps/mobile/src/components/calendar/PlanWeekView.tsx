import { useMemo } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/typography/Text';
import { ConnectCalendarCard } from '@/components/calendar/ConnectCalendarCard';
import { CalendarContinuityBanner } from '@/components/calendar/CalendarContinuityBanner';
import type { CalendarConnectionStatus } from '@/types/calendar';
import type { MeridianCalendarEvent } from '@/types/calendar';
import { PromotedCaptureCard } from '@/components/plan/PromotedCaptureCard';
import { PlanEventCard } from '@/components/calendar/PlanEventCard';
import { getPlanForwardDays, isEventInPlanWindow } from '@/services/calendar/planBounds';
import { buildPlanDayColumns } from '@/services/plan/buildPlanDaySchedule';
import type { PlanPromotedCapture } from '@/types/plan';
import { makeStyles, spacing } from '@/theme';

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

type PlanWeekViewProps = {
  status: CalendarConnectionStatus;
  events: MeridianCalendarEvent[];
  promotedCaptures?: PlanPromotedCapture[];
  continuityHint: string | null;
  weekWhisper?: string | null;
  configured: boolean;
  onConnect: () => void;
  connecting: boolean;
  onViewEventDetail: (event: MeridianCalendarEvent) => void;
  onPromotedCapturePress?: (capture: PlanPromotedCapture) => void;
};

export function PlanWeekView({
  status,
  events,
  promotedCaptures = [],
  continuityHint,
  weekWhisper,
  configured,
  onConnect,
  connecting,
  onViewEventDetail,
  onPromotedCapturePress,
}: PlanWeekViewProps) {
  const styles = useStyles();
  const planDays = useMemo(() => getPlanForwardDays(), []);
  const planEvents = useMemo(
    () => events.filter((e) => isEventInPlanWindow(e)),
    [events],
  );
  const todayKey = startOfDay(new Date()).toISOString();
  const hasCapturePlan = promotedCaptures.length > 0;
  const allEmpty = planEvents.length === 0 && !hasCapturePlan;

  const timeline = (
    <View style={styles.timeline}>
      {planDays.map((day) => {
        const key = startOfDay(day).toISOString();
        const { events: dayEvents, captures: dayCaptures } = buildPlanDayColumns(
          day,
          planEvents,
          promotedCaptures,
        );
        const isToday = key === todayKey;
        const tomorrowKey = startOfDay(new Date(new Date().setDate(new Date().getDate() + 1))).toISOString();
        const isTomorrow = !isToday && key === tomorrowKey;
        const label = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : day.toLocaleDateString(undefined, { weekday: 'long' });
        const dateLabel = day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const dayEmpty = dayEvents.length === 0 && dayCaptures.length === 0;

        return (
          <View key={key} style={styles.daySection}>
            <View style={styles.dayHeaderRow}>
              <Text
                variant="callout"
                weight={isToday ? 'semibold' : 'regular'}
                style={[styles.dayLabel, isToday && styles.dayLabelToday]}
                maxFontSizeMultiplier={1.1}
              >
                {label}
              </Text>
              <Text
                variant="footnote"
                color="inkGhost"
                maxFontSizeMultiplier={1.0}
              >
                · {dateLabel}
              </Text>
            </View>

            {dayEmpty ? (
              <Text variant="footnote" color="inkGhost" style={styles.emptyDay}>
                Open
              </Text>
            ) : (
              <>
                {dayEvents.map((event) => (
                  <PlanEventCard
                    key={event.id}
                    event={event}
                    onViewDetail={onViewEventDetail}
                  />
                ))}
                {dayCaptures.length > 0 ? (
                  <View style={styles.capturedGroup}>
                    <Text
                      variant="caption"
                      color="inkTertiary"
                      style={styles.capturedLabel}
                      maxFontSizeMultiplier={1.05}
                    >
                      Intentions
                    </Text>
                    {dayCaptures.map((capture) => (
                      <PromotedCaptureCard
                        key={`capture-${capture.sourceCaptureId}`}
                        capture={capture}
                        onPress={onPromotedCapturePress}
                      />
                    ))}
                  </View>
                ) : null}
              </>
            )}
          </View>
        );
      })}
    </View>
  );

  if (!configured && !hasCapturePlan) {
    return (
      <View style={styles.wrap}>
        <Text variant="caption" color="inkGhost" style={styles.eyebrow}>
          Coming up
        </Text>
        <Text variant="display" color="ink" style={styles.headline}>
          Connect calendar to see what&apos;s ahead.
        </Text>
        <Text variant="body" color="inkSecondary" style={styles.subline}>
          Calendar isn&apos;t connected yet.
        </Text>
      </View>
    );
  }

  if (
    !hasCapturePlan &&
    (status === 'not_connected' ||
      status === 'token_expired' ||
      status === 'auth_failed')
  ) {
    return (
      <View style={styles.wrap}>
        <Text variant="caption" color="inkGhost" style={styles.eyebrow}>
          Coming up
        </Text>
        <Text variant="display" color="ink" style={styles.headline}>
          {status === 'token_expired'
            ? 'Calendar needs to reconnect.'
            : status === 'auth_failed'
              ? "Couldn't connect calendar right now."
              : "Here's what's ahead."}
        </Text>
        {continuityHint && <CalendarContinuityBanner message={continuityHint} />}
        <ConnectCalendarCard onConnect={onConnect} loading={connecting} />
      </View>
    );
  }

  if (status === 'offline' && planEvents.length === 0 && !hasCapturePlan) {
    return (
      <View style={styles.wrap}>
        <Text variant="caption" color="inkGhost" style={styles.eyebrow}>
          This week
        </Text>
        <Text variant="display" color="ink" style={styles.headline}>
          Couldn&apos;t refresh calendar right now.
        </Text>
        {continuityHint && <CalendarContinuityBanner message={continuityHint} />}
        <ConnectCalendarCard onConnect={onConnect} loading={connecting} />
      </View>
    );
  }

  if (status === 'loading' && allEmpty) {
    return (
      <View style={styles.wrap}>
        <Text variant="caption" color="inkGhost" style={styles.eyebrow}>
          This week
        </Text>
        <Text variant="display" color="ink" style={styles.headline}>
          Pulling in your week…
        </Text>
        <Text variant="body" color="inkSecondary" style={styles.subline}>
          Just a moment.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text variant="caption" color="inkGhost" style={styles.eyebrow}>
        This week
      </Text>
      <Text variant="display" color="ink" style={styles.headline}>
        {allEmpty
          ? 'This week still has breathing room.'
          : hasCapturePlan && planEvents.length === 0
            ? 'Captured plans are showing up here.'
            : "Here's the shape of your week."}
      </Text>
      {weekWhisper && !allEmpty ? (
        <Text variant="body" color="inkGhost" style={styles.subline}>
          {weekWhisper}
        </Text>
      ) : null}
      {hasCapturePlan && !configured ? (
        <Text variant="body" color="inkSecondary" style={styles.subline}>
          Dashed items are from your captures — connect calendar to see everything together.
        </Text>
      ) : null}
      {continuityHint && <CalendarContinuityBanner message={continuityHint} />}
      {!configured && hasCapturePlan ? (
        <ConnectCalendarCard onConnect={onConnect} loading={connecting} />
      ) : null}
      {timeline}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: {
    flex: 1,
    gap: spacing[4],
    paddingBottom: spacing[8],
  },
  eyebrow: { letterSpacing: 0.4 },
  headline: { maxWidth: 320 },
  subline: { maxWidth: 280, marginTop: -spacing[1] },
  timeline: {
    marginTop: spacing[2],
    gap: spacing[5],
  },
  daySection: {
    gap: spacing[2],
  },
  dayHeaderRow: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    gap: spacing[2],
  },
  dayLabel: {
    color: c.inkTertiary,
    letterSpacing: 0.2,
  },
  dayLabelToday: {
    color: c.ink,
  },
  emptyDay: {
    paddingLeft: spacing[4],
    fontStyle: 'italic' as const,
  },
  capturedGroup: {
    marginTop: spacing[1],
    gap: spacing[2],
  },
  capturedLabel: {
    letterSpacing: 0.35,
    textTransform: 'uppercase' as const,
    marginBottom: -spacing[1],
  },
}));
