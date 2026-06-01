/**
 * Meridian — CompletionToast
 *
 * Soft undo affordance after completion. Anchored above the tab bar.
 */

import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/typography/Text';
import { makeStyles, radius, spacing, tabBarBottomInset, tabBarHeight } from '@/theme';
import { motionDuration } from '@/animations/motionTokens';
import type { PendingUndo } from '@/store/focusStore';

const UNDO_WINDOW_MS = 3000;

type CompletionToastProps = {
  pendingUndo: PendingUndo | null;
  onUndo: () => void;
  onCommit: () => void;
};

export function CompletionToast({
  pendingUndo,
  onUndo,
  onCommit,
}: CompletionToastProps) {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bottomOffset =
    tabBarHeight + tabBarBottomInset + insets.bottom + spacing[4];

  const handleUndo = () => {
    Haptics.selectionAsync().catch(() => {});
    clearCommitTimer();
    onUndo();
  };

  const clearCommitTimer = () => {
    if (commitTimerRef.current) {
      clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }
  };

  const dismiss = (cb?: () => void) => {
    opacity.value = withTiming(0, { duration: motionDuration.fast });
    translateY.value = withTiming(8, { duration: motionDuration.fast }, () => {
      if (cb) runOnJS(cb)();
    });
  };

  useEffect(() => {
    clearCommitTimer();

    if (!pendingUndo) {
      dismiss();
      return;
    }

    opacity.value = withTiming(1, { duration: motionDuration.fast });
    translateY.value = withTiming(0, { duration: motionDuration.standard });

    commitTimerRef.current = setTimeout(() => {
      dismiss(onCommit);
    }, UNDO_WINDOW_MS);

    return () => clearCommitTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingUndo?.itemId]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!pendingUndo) return null;

  return (
    <Animated.View
      style={[styles.container, { bottom: bottomOffset }, animStyle]}
      pointerEvents="box-none"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.toast}>
        <Text
          variant="callout"
          style={styles.label}
          maxFontSizeMultiplier={1.1}
          numberOfLines={1}
        >
          Completed
        </Text>

        <View style={styles.divider} />

        <Pressable
          onPress={handleUndo}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={`Undo completion for ${pendingUndo.title}`}
        >
          <Text
            variant="callout"
            style={styles.undoAction}
            maxFontSizeMultiplier={1.1}
          >
            Undo
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const useStyles = makeStyles((c) => ({
  container: {
    position: 'absolute' as const,
    left: spacing[5],
    right: spacing[5],
    alignItems: 'center' as const,
    zIndex: 100,
  },
  toast: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: c.toastBg,
    borderRadius: radius.full,
    paddingVertical: spacing[2] + 2,
    paddingHorizontal: spacing[4],
    gap: spacing[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  label: {
    color: c.toastText,
    flexShrink: 1,
  },
  divider: {
    width: 1,
    height: 14,
    backgroundColor: c.sheetHandle,
    opacity: 0.4,
  },
  undoAction: {
    color: c.toastAction,
    fontWeight: '600' as const,
  },
}));
