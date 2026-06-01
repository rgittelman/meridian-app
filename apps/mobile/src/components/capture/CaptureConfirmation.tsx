import { useEffect } from 'react';
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
import { makeStyles, radius, spacing } from '@/theme';

export function CaptureConfirmation() {
  const { confirmationMessage, clearConfirmation } = useCaptureStore();
  const styles = useStyles();
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
      <Animated.View style={styles.pill} accessibilityLiveRegion="polite">
        <Text
          variant="callout"
          style={styles.text}
          maxFontSizeMultiplier={1.1}
        >
          {confirmationMessage}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: {
    alignItems: 'flex-start' as const,
  },
  pill: {
    backgroundColor: c.confirmationBg,
    borderWidth: 0.5,
    borderColor: c.confirmationBorder,
    borderRadius: radius.full,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  text: {
    color: c.confirmationText,
  },
}));
