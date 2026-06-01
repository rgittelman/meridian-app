import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CaptureConfirmation } from '@/components/capture/CaptureConfirmation';
import { CaptureHeader } from '@/components/capture/CaptureHeader';
import { CaptureInput } from '@/components/capture/CaptureInput';
import { RecentCaptures } from '@/components/capture/RecentCaptures';
import { SuggestedExamples } from '@/components/capture/SuggestedExamples';
import { useCaptureInput } from '@/hooks/useCaptureInput';
import { useCaptureStore } from '@/store/captureStore';
import {
  colors,
  screenPaddingHorizontal,
  screenPaddingTop,
  spacing,
  tabBarBottomInset,
  tabBarHeight,
} from '@/theme';

/**
 * Meridian Capture Screen.
 *
 * Emotional goal: user feels relieved within seconds of opening.
 * "I don't need to organize this perfectly for Meridian to help me."
 *
 * Layout:
 *  1. Confirmation toast (shown briefly after capture)
 *  2. Ambient header
 *  3. Natural language input surface
 *  4. Suggested examples
 *  5. Recent captures
 *  6. Recovery space
 */
export function CaptureScreen() {
  const insets = useSafeAreaInsets();
  const captureInput = useCaptureInput();
  const items = useCaptureStore((s) => s.items);

  const topPad = insets.top + screenPaddingTop;
  const bottomPad =
    tabBarHeight + tabBarBottomInset + spacing[4] + insets.bottom;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: topPad, paddingBottom: bottomPad },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        overScrollMode="never"
      >
        {/* 1 · Confirmation — appears briefly after each capture */}
        <View style={styles.padH}>
          <CaptureConfirmation />
        </View>

        {/* Spacing: only show gap when confirmation is visible */}
        <Divider size="md" />

        {/* 2 · Ambient header */}
        <View style={styles.padH}>
          <CaptureHeader variant={0} />
        </View>

        <Divider size="lg" />

        {/* 3 · Natural language input */}
        <View style={styles.padH}>
          <CaptureInput
            {...captureInput}
            onMicPress={() => {
              // Future: open voice capture sheet
            }}
          />
        </View>

        <Divider size="lg" />

        {/* 4 · Suggested examples — full-width horizontal scroll */}
        <SuggestedExamples
          onSelect={(text) => {
            captureInput.setValue(text);
            captureInput.inputRef.current?.focus();
          }}
        />

        {items.length > 0 && (
          <>
            <Divider size="xl" />
            {/* 5 · Recent captures */}
            <View style={styles.padH}>
              <RecentCaptures items={items} />
            </View>
          </>
        )}

        {/* 6 · Recovery space — communicates: "You don't have to do more." */}
        <View style={styles.recoverySpace} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Divider({ size }: { size: 'sm' | 'md' | 'lg' | 'xl' }) {
  const heights = {
    sm: spacing[3],
    md: spacing[4],
    lg: spacing[6],
    xl: spacing[8],
  };
  return <View style={{ height: heights[size] }} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  padH: {
    paddingHorizontal: screenPaddingHorizontal,
  },
  recoverySpace: {
    height: spacing[10] + spacing[8],
  },
});
