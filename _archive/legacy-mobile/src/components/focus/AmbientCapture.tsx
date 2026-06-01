import * as Haptics from 'expo-haptics';
import { Mic, Plus } from 'lucide-react-native';
import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Text } from '@/components/typography/Text';
import { springConfig } from '@/animations/motionTokens';
import { colors, minTouchTarget, radius, spacing } from '@/theme';

type AmbientCaptureProps = {
  placeholder?: string;
  onPress?: () => void;
  onMicPress?: () => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function AmbientCapture({
  placeholder = "What's taking up space?",
  onPress,
  onMicPress,
}: AmbientCaptureProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.985, springConfig.gentle);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, springConfig.gentle);
  }, [scale]);

  const handlePress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  }, [onPress]);

  const handleMicPress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onMicPress?.();
  }, [onMicPress]);

  return (
    <View style={styles.wrap}>
      {/* Main tap target — opens capture sheet */}
      <AnimatedPressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        style={[styles.entry, animStyle]}
        accessibilityRole="button"
        accessibilityLabel="Open capture — get something out of your head"
        accessibilityHint={placeholder}
      >
        {/* Plus icon */}
        <View style={styles.plusWrap}>
          <Plus size={16} color={colors.inkTertiary} strokeWidth={2} />
        </View>

        {/* Placeholder text */}
        <Text
          variant="body"
          color="inkGhost"
          style={styles.placeholder}
          maxFontSizeMultiplier={1.15}
          numberOfLines={1}
        >
          {placeholder}
        </Text>

        {/* Mic icon — separate touch target for voice capture */}
        <Pressable
          onPress={handleMicPress}
          style={styles.micWrap}
          accessibilityRole="button"
          accessibilityLabel="Voice capture"
          hitSlop={12}
        >
          <Mic size={17} color={colors.inkTertiary} strokeWidth={1.75} />
        </Pressable>
      </AnimatedPressable>
    </View>
  );
}

const ENTRY_HEIGHT = 54;

const styles = StyleSheet.create({
  wrap: {
    gap: spacing[3],
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ENTRY_HEIGHT,
    minHeight: minTouchTarget,
    backgroundColor: colors.captureEntry,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.captureEntryBorder,
    borderRadius: radius.xl,
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  plusWrap: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  placeholder: {
    flex: 1,
  },
  micWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
