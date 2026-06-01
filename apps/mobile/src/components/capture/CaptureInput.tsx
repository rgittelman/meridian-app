import { ArrowUp, Mic } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { TextInput } from 'react-native';

import { Text } from '@/components/typography/Text';
import { motionDuration } from '@/animations/motionTokens';
import { useRotatingPlaceholder } from '@/hooks/useRotatingPlaceholder';
import type { UseCaptureInputReturn } from '@/hooks/useCaptureInput';
import { useTheme } from '@/hooks/useTheme';
import {
  makeStyles,
  fontFamily,
  fontSize,
  lineHeight,
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
  | 'scrollEnabled'
> & {
  onMicPress?: () => void;
};

const SUBMIT_SIZE = 32;

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
  scrollEnabled,
  onMicPress,
}: CaptureInputProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { text: placeholder, isTransitioning } = useRotatingPlaceholder();

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
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={setValue}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onContentSizeChange={onContentSizeChange}
        multiline
        placeholder={isTransitioning ? '' : placeholder}
        placeholderTextColor={colors.captureInputPlaceholder}
        style={[styles.input, { height: Math.max(inputHeight, 56) }]}
        textAlignVertical="top"
        returnKeyType="default"
        blurOnSubmit={false}
        maxFontSizeMultiplier={1.2}
        accessibilityLabel="Capture input"
        accessibilityHint="Type anything — a task, thought, or reminder"
        scrollEnabled={scrollEnabled}
        autoCorrect
        autoCapitalize="sentences"
      />

      <View style={styles.actionRow}>
        <Pressable
          onPress={onMicPress}
          style={styles.micButton}
          accessibilityRole="button"
          accessibilityLabel="Voice capture"
          hitSlop={12}
        >
          <Mic
            size={18}
            color={isFocused ? colors.inkTertiary : colors.inkGhost}
            strokeWidth={1.75}
          />
        </Pressable>

        <View style={styles.spacer} />

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

const useStyles = makeStyles((c) => ({
  container: {
    backgroundColor: c.captureInputBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.captureInputBorder,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
    gap: spacing[2],
  },
  input: {
    color: c.ink,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    lineHeight: lineHeight.body,
    padding: 0,
    margin: 0,
    includeFontPadding: false,
  },
  actionRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    minHeight: 36,
  },
  micButton: {
    width: 36,
    height: 36,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  spacer: { flex: 1 },
  submitButton: {
    width: SUBMIT_SIZE,
    height: SUBMIT_SIZE,
    borderRadius: radius.full,
    backgroundColor: c.accent,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  hint: {
    paddingTop: spacing[1],
  },
}));
