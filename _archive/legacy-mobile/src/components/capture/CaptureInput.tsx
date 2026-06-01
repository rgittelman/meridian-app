import { ArrowUp, Mic } from 'lucide-react-native';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/typography/Text';
import { motionDuration } from '@/animations/motionTokens';
import { useRotatingPlaceholder } from '@/hooks/useRotatingPlaceholder';
import type { UseCaptureInputReturn } from '@/hooks/useCaptureInput';
import {
  colors,
  fontFamily,
  fontSize,
  lineHeight,
  minTouchTarget,
  radius,
  spacing,
} from '@/theme';
import { isIOS } from '@/utils/platform';

type CaptureInputProps = Pick<
  UseCaptureInputReturn,
  | 'value'
  | 'setValue'
  | 'inputHeight'
  | 'inputRef'
  | 'isFocused'
  | 'onFocus'
  | 'onBlur'
  | 'onContentSizeChange'
  | 'submit'
  | 'canSubmit'
> & {
  onMicPress?: () => void;
};

export function CaptureInput({
  value,
  setValue,
  inputHeight,
  inputRef,
  isFocused,
  onFocus,
  onBlur,
  onContentSizeChange,
  submit,
  canSubmit,
  onMicPress,
}: CaptureInputProps) {
  const { text: placeholder, isTransitioning } = useRotatingPlaceholder();

  /** 0 = unfocused, 1 = focused */
  const focusProgress = useSharedValue(0);

  const handleFocus = () => {
    focusProgress.value = withTiming(1, { duration: motionDuration.standard });
    onFocus();
  };

  const handleBlur = () => {
    focusProgress.value = withTiming(0, { duration: motionDuration.standard });
    onBlur();
  };

  const borderStyle = useAnimatedStyle(() => ({
    opacity: 0.7 + focusProgress.value * 0.3,
    borderColor: focusProgress.value > 0.5
      ? colors.captureInputFocusBorder
      : colors.captureInputBorder,
  }));

  return (
    <Animated.View style={[styles.container, borderStyle]}>
      {/* Text input */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={setValue}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onContentSizeChange={onContentSizeChange}
        multiline
        placeholder={isTransitioning ? '' : placeholder}
        placeholderTextColor={colors.inkGhost}
        style={[styles.input, { height: Math.max(inputHeight, 56) }]}
        textAlignVertical="top"
        returnKeyType="default"
        blurOnSubmit={false}
        maxFontSizeMultiplier={1.2}
        accessibilityLabel="Capture input"
        accessibilityHint="Type anything — a task, thought, or reminder"
        scrollEnabled={inputHeight >= 180}
        autoCorrect
        autoCapitalize="sentences"
      />

      {/* Action row */}
      <View style={styles.actionRow}>
        {/* Mic — voice capture entry point */}
        <Pressable
          onPress={onMicPress}
          style={styles.micButton}
          accessibilityRole="button"
          accessibilityLabel="Voice capture"
          hitSlop={12}
        >
          <Mic size={18} color={isFocused ? colors.inkTertiary : colors.inkGhost} strokeWidth={1.75} />
        </Pressable>

        <View style={styles.spacer} />

        {/* Submit — only visible when there is content */}
        {canSubmit && (
          <Pressable
            onPress={submit}
            style={styles.submitButton}
            accessibilityRole="button"
            accessibilityLabel="Capture this thought"
            hitSlop={8}
          >
            <ArrowUp size={16} color={colors.background} strokeWidth={2.25} />
          </Pressable>
        )}
      </View>

      {/* Hint — shown when focused and empty */}
      {isFocused && !value && (
        <Text
          variant="footnote"
          color="inkGhost"
          style={styles.hint}
          maxFontSizeMultiplier={1.1}
        >
          Press return for a new line. Tap{' '}
          <Text variant="footnote" color="accent">↑</Text>
          {' '}when ready.
        </Text>
      )}
    </Animated.View>
  );
}

const SUBMIT_SIZE = 32;

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.captureInputBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.captureInputBorder,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
    gap: spacing[2],
  },
  input: {
    color: colors.ink,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    lineHeight: lineHeight.body,
    padding: 0,
    margin: 0,
    includeFontPadding: false,
    // iOS: disable scroll gutter
    ...(isIOS ? {} : {}),
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: minTouchTarget * 0.8,
  },
  micButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: { flex: 1 },
  submitButton: {
    width: SUBMIT_SIZE,
    height: SUBMIT_SIZE,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    paddingTop: spacing[1],
  },
});
