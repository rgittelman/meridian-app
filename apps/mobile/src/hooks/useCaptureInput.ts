import * as Haptics from 'expo-haptics';
import {
  useCallback,
  useRef,
  useState,
  type RefObject,
} from 'react';
import type { NativeSyntheticEvent, TextInput, TextInputContentSizeChangeEventData } from 'react-native';

import { logCaptureInputHeight } from '@/services/quality/qualityDebug';
import { useCaptureStore } from '@/store/captureStore';
import { lineHeight } from '@/theme/typography';

/** Visible lines before the field scrolls internally */
const MIN_VISIBLE_LINES = 4;
const LINE_PX = lineHeight.body;
const MIN_INPUT_HEIGHT = LINE_PX * MIN_VISIBLE_LINES + 8;
const SCROLL_AT_HEIGHT = LINE_PX * MIN_VISIBLE_LINES + 16;
const MAX_INPUT_HEIGHT = LINE_PX * 10;

export type UseCaptureInputReturn = {
  value: string;
  setValue: (v: string) => void;
  inputHeight: number;
  inputRef: RefObject<TextInput | null>;
  isFocused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onContentSizeChange: (e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => void;
  submit: () => void;
  isSubmitting: boolean;
  canSubmit: boolean;
  scrollEnabled: boolean;
};

export function useCaptureInput(): UseCaptureInputReturn {
  const [value, setValue] = useState('');
  const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);
  const [isFocused, setIsFocused] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const { addCapture, isSubmitting } = useCaptureStore();

  const onContentSizeChange = useCallback(
    (e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
      const measured = e.nativeEvent.contentSize.height;
      const lineCount = Math.max(value.split('\n').length, 1);
      const lineBased = lineCount * LINE_PX + 8;
      const next = Math.min(
        Math.max(measured, lineBased, MIN_INPUT_HEIGHT),
        MAX_INPUT_HEIGHT,
      );
      setInputHeight(next);
      logCaptureInputHeight(next, Math.round(next / LINE_PX));
    },
    [value],
  );

  const submit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isSubmitting) return;

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addCapture(trimmed);

    setValue('');
    setInputHeight(MIN_INPUT_HEIGHT);
    inputRef.current?.blur();
  }, [value, isSubmitting, addCapture]);

  return {
    value,
    setValue,
    inputHeight,
    inputRef,
    isFocused,
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
    onContentSizeChange,
    submit,
    isSubmitting,
    canSubmit: value.trim().length > 0,
    scrollEnabled: inputHeight >= SCROLL_AT_HEIGHT,
  };
}
