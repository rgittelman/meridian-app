import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/typography/Text';
import { motionDuration } from '@/animations/motionTokens';
import { useCaptureStore } from '@/store/captureStore';
import { colors, radius, spacing } from '@/theme';

/**
 * Soft inline confirmation that appears briefly after a capture.
 * Fades in, holds for 1.2s, fades out — then clears from store.
 * Lives at the top of the screen content, above the input.
 */
export function CaptureConfirmation() {
  const { confirmationMessage, clearConfirmation } = useCaptureStore();
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!confirmationMessage) {
      opacity.value = 0;
      return;
    }

    opacity.value = withTiming(1, { duration: motionDuration.fast }, () => {
      opacity.value = withDelay(
        1200,
        withTiming(0, { duration: motionDuration.standard }, () => {
          runOnJS(clearConfirmation)();
        }),
      );
    });
  }, [confirmationMessage, clearConfirmation, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: (1 - opacity.value) * -4 }],
  }));

  if (!confirmationMessage) return null;

  return (
    <Animated.View style={[styles.wrap, animStyle]} pointerEvents="none">
      <View style={styles.pill} accessibilityLiveRegion="polite">
        <Text
          variant="callout"
          style={styles.text}
          maxFontSizeMultiplier={1.1}
        >
          {confirmationMessage}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'flex-start',
  },
  pill: {
    backgroundColor: colors.confirmationBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.confirmationBorder,
    borderRadius: radius.full,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  text: {
    color: colors.confirmationText,
  },
});
