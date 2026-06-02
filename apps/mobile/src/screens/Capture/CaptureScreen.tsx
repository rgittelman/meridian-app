import { useRoute, useFocusEffect, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useCallback } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';

import { Text } from '@/components/typography/Text';
import { useTheme } from '@/hooks/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CaptureConfirmation } from '@/components/capture/CaptureConfirmation';
import { CaptureIntelligenceDiagnostics } from '@/components/capture/CaptureIntelligenceDiagnostics';
import { CaptureHeader } from '@/components/capture/CaptureHeader';
// DEV ONLY — remove after verifying notification delivery
import { NotificationSmokeTest } from '@/components/dev/NotificationSmokeTest';
import { CaptureInput } from '@/components/capture/CaptureInput';
import { RecentCaptures } from '@/components/capture/RecentCaptures';
import { SuggestedExamples } from '@/components/capture/SuggestedExamples';
import { useCaptureInput } from '@/hooks/useCaptureInput';
import { useCaptureStore } from '@/store/captureStore';
import type { RootTabParamList } from '@/types/navigation';
import { isDevEnvironment } from '@/utils/isDev';
import {
  makeStyles,
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
  const navigation =
    useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const route = useRoute<RouteProp<RootTabParamList, 'Capture'>>();
  const captureInput = useCaptureInput();
  const items = useCaptureStore((s) => s.items);
  const lastCaptureAudit = useCaptureStore((s) => s.lastCaptureAudit);
  const { colors } = useTheme();
  const styles = useStyles();
  const showDevDiagnostics = isDevEnvironment();

  useFocusEffect(
    useCallback(() => {
      if (route.params?.focusInput !== true) return;

      const timer = setTimeout(() => {
        captureInput.inputRef.current?.focus();
      }, 120);

      return () => clearTimeout(timer);
    }, [route.params?.focusInput, captureInput.inputRef]),
  );

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
          {showDevDiagnostics && lastCaptureAudit && items[0] ? (
            <View style={styles.devDiagnostics}>
              <CaptureIntelligenceDiagnostics
                item={items[0]}
                audit={lastCaptureAudit}
              />
            </View>
          ) : null}
          {/* DEV ONLY — remove after verifying notification delivery */}
          {showDevDiagnostics ? <NotificationSmokeTest /> : null}
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
            onMicPress={() => captureInput.inputRef.current?.focus()}
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

        {/* 6 · Graceful closure — soft atmospheric end of screen */}
        <View style={styles.closure}>
          <Text
            variant="caption"
            style={styles.closureText}
            maxFontSizeMultiplier={1.1}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            Nothing here has to be perfect.
          </Text>
        </View>
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

const useStyles = makeStyles((c) => ({
  root: {
    flex: 1,
    backgroundColor: c.background,
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
  devDiagnostics: {
    marginTop: spacing[3],
  },
  closure: {
    paddingTop: spacing[10],
    paddingBottom: spacing[6],
    alignItems: 'center' as const,
    paddingHorizontal: screenPaddingHorizontal,
  },
  closureText: {
    color: c.inkGhost,
    opacity: 0.52,
    textAlign: 'center' as const,
  },
}));
