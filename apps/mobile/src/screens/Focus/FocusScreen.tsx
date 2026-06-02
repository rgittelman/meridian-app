import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ScreenContainer } from '@/components/ScreenContainer';
import { AmbientCapture } from '@/components/focus/AmbientCapture';
import { CalmWins } from '@/components/focus/CalmWins';
import { CompletionToast } from '@/components/focus/CompletionToast';
import { FocusStack } from '@/components/focus/FocusStack';
import { GreetingSection } from '@/components/focus/GreetingSection';
import { MomentumRing } from '@/components/focus/MomentumRing';
import { PrepAwarenessSection } from '@/components/focus/PrepAwarenessSection';
import { ScheduleStrip } from '@/components/focus/ScheduleStrip';
import { SnoozeSheet } from '@/components/focus/SnoozeSheet';
import { useCalendar } from '@/hooks/useCalendar';
import { useGreeting } from '@/hooks/useGreeting';
import { useOrchestration } from '@/hooks/useOrchestration';
import { useLifeIntelligence } from '@/hooks/useLifeIntelligence';
import { usePrepIntelligence } from '@/hooks/usePrepIntelligence';
import { useResurfacingItems } from '@/hooks/useResurfacingItems';
import { useCaptureStoreHydrated } from '@/hooks/useCaptureStoreHydrated';
import { useCaptureStore } from '@/store/captureStore';
import { useFocusStore } from '@/store/focusStore';
import type { SnoozeTiming } from '@/store/focusStore';
import { useResurfacingStore } from '@/store/resurfacingStore';
import { FOCUS_MAX } from '@/constants/focus';
import { TAB_ROUTES } from '@/constants/tabs';
import { logFocusVisibleCount } from '@/services/quality/qualityDebug';
import type { RootTabParamList } from '@/types/navigation';
import { screenPaddingHorizontal, spacing } from '@/theme';

/**
 * Meridian Focus Screen.
 *
 * Emotional goal: user feels calmer within 5 seconds of opening.
 *
 * Intelligence layers:
 * 1. useResurfacingItems — selects what matters, timing-aware, cooldown-managed
 * 2. useOrchestration — detects overload, paces emotional sequencing, compresses when needed
 * 3. focusStore — tracks completions, snoozes, momentum, pending undo
 *
 * Interactions:
 * - Swipe right → complete with 3-second undo window
 * - Swipe left → snooze → SnoozeSheet timing selection
 * - Both gestures: forgiving, reversible, never destructive
 *
 * Layout:
 * greeting → momentum ring → focus stack → schedule → prep awareness → wins → capture → recovery
 */
export function FocusScreen() {
  const navigation =
    useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const [snoozeTargetId, setSnoozeTargetId] = useState<string | null>(null);
  const [snoozeTargetTitle, setSnoozeTargetTitle] = useState<string | null>(null);

  const openCapture = useCallback(() => {
    navigation.navigate(TAB_ROUTES.Capture, { focusInput: true });
  }, [navigation]);

  const {
    status: calendarStatus,
    weekEvents: calendarWeekEvents,
    upcomingSchedule,
    continuityHint: calendarHint,
    configured: calendarConfigured,
    connect: connectCalendar,
  } = useCalendar();
  const calendarConnecting = calendarStatus === 'loading';

  const lifeSnapshot = useLifeIntelligence();
  const { name: greetingName, timeOfDay } = useGreeting();
  const prepSnapshot = usePrepIntelligence();

  // Intelligence pipeline (calendar + life domains inform resurfacing)
  const { items: resurfaced, insight: resurfacingInsight } = useResurfacingItems({
    calendarEvents: calendarWeekEvents,
    lifeSnapshot,
  });
  const { orchestratedItems, overloadState, recoveryMessage } = useOrchestration(
    resurfaced,
    calendarWeekEvents,
    lifeSnapshot,
  );

  // Focus interaction state
  const {
    completedIds,
    snoozedItems,
    pendingUndo,
    momentumProgress,
    completeItem,
    undoCompletion,
    commitCompletion,
    snoozeItem,
    expireSnoozedItems,
  } = useFocusStore();

  // Expire snoozed items whose return window has elapsed since last session.
  useEffect(() => {
    expireSnoozedItems();
  }, [expireSnoozedItems]);

  const deferItem = useResurfacingStore((s) => s.deferItem);
  const captureHydrated = useCaptureStoreHydrated();
  const hasCaptures =
    !captureHydrated ||
    useCaptureStore((s) =>
      s.items.some((i) => i.status !== 'done' && i.status !== 'archived'),
    );

  // Filter out completed and snoozed items from the visible stack
  const snoozedIds = snoozedItems.map((s) => s.id);
  const visibleItems = orchestratedItems
    .filter(
      (item) => !completedIds.includes(item.id) && !snoozedIds.includes(item.id),
    )
    .slice(0, FOCUS_MAX);

  logFocusVisibleCount(visibleItems.length, orchestratedItems.length);

  // Derive active insight — prefer recovery message during high overload,
  // fall back to resurfacing insight
  const activeInsight = recoveryMessage ?? resurfacingInsight;

  // ── Gesture handlers ─────────────────────────────────────────────────────

  const handleItemComplete = useCallback(
    (id: string, title: string) => {
      completeItem(id, title);
    },
    [completeItem],
  );

  const handleItemSnooze = useCallback(
    (id: string) => {
      const item = visibleItems.find((i) => i.id === id);
      setSnoozeTargetId(id);
      setSnoozeTargetTitle(item?.title ?? null);
    },
    [visibleItems],
  );

  const handleSnoozeSelect = useCallback(
    (timing: SnoozeTiming) => {
      if (snoozeTargetId) {
        snoozeItem(snoozeTargetId, timing);
        deferItem(snoozeTargetId);
      }
      setSnoozeTargetId(null);
      setSnoozeTargetTitle(null);
    },
    [snoozeTargetId, snoozeItem, deferItem],
  );

  const handleSnoozeDismiss = useCallback(() => {
    setSnoozeTargetId(null);
    setSnoozeTargetTitle(null);
  }, []);

  // ── Momentum ring label (derived from progress) ──────────────────────────

  const momentumLabel =
    momentumProgress >= 0.85 ? 'Strong' :
    momentumProgress >= 0.65 ? 'Steady' :
    momentumProgress >= 0.40 ? 'Building' :
    'Starting';

  return (
    <View style={staticStyles.root}>
      <ScreenContainer
        scrollable
        contentStyle={staticStyles.contentOverride}
        testID="focus-screen"
      >
        {/* 1 · Greeting */}
        <View style={staticStyles.padH}>
          <GreetingSection timeOfDay={timeOfDay} name={greetingName} />
        </View>

        <Divider size="lg" />

        {/* 2 · Momentum Ring — progress driven by focusStore */}
        <MomentumRing
          progress={momentumProgress}
          momentumLabel={momentumLabel}
          dayLabel="Today"
        />

        <Divider size="lg" />

        {/* 3 · Focus Stack — orchestrated, timing-aware, gesture-enabled */}
        <View style={staticStyles.padH}>
          <FocusStack
            resurfacedItems={visibleItems}
            hasCaptures={hasCaptures}
            insight={activeInsight}
            overloadState={overloadState}
            onItemComplete={handleItemComplete}
            onItemSnooze={handleItemSnooze}
            completedCount={completedIds.length}
          />
        </View>

        <Divider size="xl" />

        {/* 4 · Schedule Awareness Strip — commitments before prep context */}
        <ScheduleStrip
          items={upcomingSchedule}
          status={calendarStatus}
          configured={calendarConfigured}
          onConnect={connectCalendar}
          connecting={calendarConnecting}
          continuityHint={calendarHint}
        />

        {prepSnapshot.surfacedForFocus.length > 0 && (
          <>
            <Divider size="lg" />
            <View style={staticStyles.padH}>
              <PrepAwarenessSection
                items={prepSnapshot.surfacedForFocus}
                overflowCount={prepSnapshot.focusPrepOverflowCount}
              />
            </View>
          </>
        )}

        <Divider size="xl" />

        {/* 5 · Calm Wins — only when something was actually completed */}
        {completedIds.length > 0 && (
          <>
            <View style={staticStyles.padH}>
              <CalmWins count={completedIds.length} />
            </View>
            <Divider size="xl" />
          </>
        )}

        {/* 6 · Ambient Capture */}
        <View style={staticStyles.padH}>
          <AmbientCapture onPress={openCapture} onMicPress={openCapture} />
        </View>

        {/* 7 · Recovery space */}
        <View style={staticStyles.recoverySpace} />
      </ScreenContainer>

      {/* ── Overlays ────────────────────────────────────────────────────── */}

      {/* Completion undo toast — positioned above tab bar */}
      <CompletionToast
        pendingUndo={pendingUndo}
        onUndo={undoCompletion}
        onCommit={commitCompletion}
      />

      {/* Snooze bottom sheet — Modal handles its own overlay */}
      <SnoozeSheet
        visible={snoozeTargetId !== null}
        itemTitle={snoozeTargetTitle}
        onSelect={handleSnoozeSelect}
        onDismiss={handleSnoozeDismiss}
      />
    </View>
  );
}

function Divider({ size }: { size: 'md' | 'lg' | 'xl' }) {
  const heights = { md: spacing[6], lg: spacing[8], xl: spacing[10] };
  return <View style={{ height: heights[size] }} />;
}

const staticStyles = StyleSheet.create({
  root: {
    flex: 1,
  },
  contentOverride: {
    paddingHorizontal: 0,
  },
  padH: {
    paddingHorizontal: screenPaddingHorizontal,
  },
  recoverySpace: {
    height: spacing[10] + spacing[8],
  },
});
