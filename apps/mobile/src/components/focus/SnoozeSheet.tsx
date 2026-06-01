/**
 * Meridian — SnoozeSheet
 *
 * Lightweight bottom sheet for deferring a Focus card.
 * Opens after a left-swipe commit. Card is held safely until a timing
 * option is selected — dismissing the sheet without selecting returns
 * the user to the unchanged Focus screen.
 *
 * Timing options:
 *   Later today       → resurfaces in ~3 hours
 *   Tomorrow morning  → resurfaces at ~7 AM
 *   This weekend      → resurfaces Friday evening
 *
 * Design:
 * - Modal overlay with blurred backdrop
 * - Sheet slides up from bottom with spring physics
 * - Drag handle for intuitive dismiss
 * - Dismiss by tapping backdrop or dragging handle down
 * - Selecting an option: calm confirmation, sheet closes
 * - No failure language, no guilt, no "postpone" framing
 *
 * Platform:
 * - iOS: springier open, native-feeling settle
 * - Android: slightly more restrained
 */

import { useEffect, useCallback } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/typography/Text';
import { makeStyles, radius, spacing } from '@/theme';
import { motionDuration, springConfig } from '@/animations/motionTokens';
import { SNOOZE_LABELS, type SnoozeTiming } from '@/store/focusStore';
import { isIOS } from '@/utils/platform';

// ── Sheet height (fixed) ─────────────────────────────────────────────────────

const SHEET_HEIGHT = 260;
const DRAG_DISMISS_THRESHOLD = SHEET_HEIGHT * 0.35;

const SHEET_SPRING = isIOS
  ? springConfig.sheet
  : { damping: 28, stiffness: 300, mass: 0.9 };

// ── Props ────────────────────────────────────────────────────────────────────

type SnoozeSheetProps = {
  visible: boolean;
  itemTitle: string | null;
  onSelect: (timing: SnoozeTiming) => void;
  onDismiss: () => void;
};

// ── Component ────────────────────────────────────────────────────────────────

export function SnoozeSheet({
  visible,
  itemTitle,
  onSelect,
  onDismiss,
}: SnoozeSheetProps) {
  const styles = useStyles();

  const translateY = useSharedValue(SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const dragOffset = useSharedValue(0);

  const open = useCallback(() => {
    backdropOpacity.value = withTiming(0.42, { duration: motionDuration.standard });
    translateY.value = withSpring(0, SHEET_SPRING);
  }, [backdropOpacity, translateY]);

  const close = useCallback(
    (cb?: () => void) => {
      backdropOpacity.value = withTiming(0, { duration: motionDuration.fast });
      translateY.value = withTiming(SHEET_HEIGHT, { duration: motionDuration.standard }, () => {
        if (cb) runOnJS(cb)();
      });
    },
    [backdropOpacity, translateY],
  );

  useEffect(() => {
    if (visible) {
      open();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } else {
      close();
    }
  }, [visible, open, close]);

  // Drag-to-dismiss gesture on the handle / sheet
  const drag = Gesture.Pan()
    .onUpdate((e) => {
      // Only allow dragging downward
      dragOffset.value = Math.max(0, e.translationY);
      translateY.value = dragOffset.value;
    })
    .onEnd((e) => {
      if (e.translationY > DRAG_DISMISS_THRESHOLD || e.velocityY > 800) {
        runOnJS(onDismiss)();
      } else {
        // Snap back
        translateY.value = withSpring(0, SHEET_SPRING);
        dragOffset.value = 0;
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const handleSelect = (timing: SnoozeTiming) => {
    Haptics.selectionAsync().catch(() => {});
    onSelect(timing);
  };

  const TIMING_OPTIONS: SnoozeTiming[] = [
    'later-today',
    'tomorrow-morning',
    'this-weekend',
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onDismiss}
        accessibilityLabel="Dismiss"
        accessibilityRole="button"
      >
        <Animated.View
          style={[staticStyles.backdrop, backdropStyle]}
          pointerEvents="none"
        />
      </Pressable>

      {/* Sheet */}
      <GestureDetector gesture={drag}>
        <Animated.View style={[styles.sheet, sheetStyle]}>
          {/* Handle */}
          <View style={styles.handleWrap} pointerEvents="none">
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text
              variant="callout"
              color="inkTertiary"
              style={styles.headerTitle}
              maxFontSizeMultiplier={1.1}
            >
              Hold onto this for now?
            </Text>
            {itemTitle && (
              <Text
                variant="footnote"
                color="inkGhost"
                numberOfLines={1}
                maxFontSizeMultiplier={1.0}
              >
                {itemTitle}
              </Text>
            )}
          </View>

          {/* Timing options */}
          <View style={styles.options}>
            {TIMING_OPTIONS.map((timing, i) => (
              <Pressable
                key={timing}
                onPress={() => handleSelect(timing)}
                style={({ pressed }) => [
                  styles.option,
                  i < TIMING_OPTIONS.length - 1 && styles.optionBorder,
                  pressed && styles.optionPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={SNOOZE_LABELS[timing]}
              >
                <Text
                  variant="body"
                  style={styles.optionText}
                  maxFontSizeMultiplier={1.15}
                >
                  {SNOOZE_LABELS[timing]}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </GestureDetector>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const useStyles = makeStyles((c) => ({
  sheet: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: c.sheetBg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: c.sheetBorder,
    paddingBottom: spacing[6],
    // Elevation for Android
    elevation: 24,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
  },
  handleWrap: {
    alignItems: 'center' as const,
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: c.sheetHandle,
  },
  header: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[3],
    gap: spacing[1],
  },
  headerTitle: {
    letterSpacing: 0.1,
  },
  options: {
    marginHorizontal: spacing[4],
    borderRadius: radius.lg,
    overflow: 'hidden' as const,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.sheetBorder,
  },
  option: {
    paddingVertical: spacing[4] + 2,
    paddingHorizontal: spacing[4],
    minHeight: 52,
    justifyContent: 'center' as const,
  },
  optionBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.sheetBorder,
  },
  optionPressed: {
    backgroundColor: c.actionSnoozeBg,
  },
  optionText: {
    color: c.sheetOptionText,
  },
}));

const staticStyles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
});
