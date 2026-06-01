import { StyleSheet, View } from 'react-native';

import { ScreenContainer } from '@/components/ScreenContainer';
import { AmbientCapture } from '@/components/focus/AmbientCapture';
import { CalmWins } from '@/components/focus/CalmWins';
import { FocusStack } from '@/components/focus/FocusStack';
import { GreetingSection } from '@/components/focus/GreetingSection';
import { MomentumRing } from '@/components/focus/MomentumRing';
import { ScheduleStrip } from '@/components/focus/ScheduleStrip';
import { screenPaddingHorizontal, spacing } from '@/theme';

/**
 * Meridian Focus Screen.
 *
 * Emotional goal: user feels calmer within 5 seconds of opening.
 * Max 3 primary focus items visible. No dashboard. No metrics.
 * Layout order mirrors cognitive priority: greeting → momentum state →
 * what matters → coming up → wins → capture → recovery.
 */
export function FocusScreen() {
  return (
    <ScreenContainer
      scrollable
      /**
       * Override horizontal padding to zero — each section applies its
       * own horizontal inset so the ScheduleStrip can bleed full-width.
       */
      contentStyle={styles.contentOverride}
      testID="focus-screen"
    >
      {/* 1 · Greeting */}
      <View style={styles.padH}>
        <GreetingSection timeOfDay="evening" name="Ryan" />
      </View>

      <Divider size="lg" />

      {/* 2 · Momentum Ring hero */}
      <MomentumRing progress={0.65} momentumLabel="Steady" dayLabel="Today" />

      <Divider size="lg" />

      {/* 3 · Focus Stack */}
      <View style={styles.padH}>
        <FocusStack />
      </View>

      <Divider size="xl" />

      {/* 4 · Schedule Awareness Strip (full-width, handles its own leading padding) */}
      <ScheduleStrip />

      <Divider size="xl" />

      {/* 5 · Calm Wins */}
      <View style={styles.padH}>
        <CalmWins count={3} />
      </View>

      <Divider size="xl" />

      {/* 6 · Ambient Capture */}
      <View style={styles.padH}>
        <AmbientCapture />
      </View>

      {/* 7 · Recovery space — communicates: "You're caught up enough." */}
      <View style={styles.recoverySpace} />
    </ScreenContainer>
  );
}

/** Thin spacer with named sizes for spacing rhythm consistency */
function Divider({ size }: { size: 'md' | 'lg' | 'xl' }) {
  const heights = { md: spacing[6], lg: spacing[8], xl: spacing[10] };
  return <View style={{ height: heights[size] }} />;
}

const styles = StyleSheet.create({
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
