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
import { useTheme } from '@/hooks/useTheme';
import { makeStyles, radius, spacing } from '@/theme';

type AmbientCaptureProps = {
  placeholder?: string;
  onPress?: () => void;
  onMicPress?: () => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function AmbientCapture({
  placeholder = "What's on your mind?",
  onPress,
  onMicPress,
}: AmbientCaptureProps) {
  const { colors } = useTheme();
  const styles = useStyles();
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
    if (onMicPress) {
      onMicPress();
      return;
    }
    onPress?.();
  }, [onMicPress, onPress]);

  return (
    <View style={styles.wrap}>
      <AnimatedPressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        style={[styles.entry, animStyle]}
        accessibilityRole="button"
        accessibilityLabel="Open capture"
        accessibilityHint="Opens capture so you can type what's on your mind"
      >
        <View style={styles.plusWrap}>
          <Plus size={16} color={colors.inkTertiary} strokeWidth={2} />
        </View>

        <Text
          variant="body"
          color="inkGhost"
          style={styles.placeholder}
          maxFontSizeMultiplier={1.15}
          numberOfLines={1}
        >
          {placeholder}
        </Text>

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

const useStyles = makeStyles((c) => ({
  wrap: {
    gap: spacing[3],
  },
  entry: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    height: 54,
    minHeight: 44,
    backgroundColor: c.captureEntry,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.captureEntryBorder,
    borderRadius: radius.xl,
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  plusWrap: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    backgroundColor: c.accentSoft,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0,
  },
  placeholder: {
    flex: 1,
  },
  micWrap: {
    width: 36,
    height: 36,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0,
  },
}));
