import * as Haptics from 'expo-haptics';
import {
  useCallback,
  useRef,
  useState,
  type RefObject,
} from 'react';
import type { NativeSyntheticEvent, TextInput, TextInputContentSizeChangeEventData } from 'react-native';

import { useCaptureStore } from '@/store/captureStore';

const MIN_INPUT_HEIGHT = 56;
const MAX_INPUT_HEIGHT = 200;

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
};

export function useCaptureInput(): UseCaptureInputReturn {
  const [value, setValue] = useState('');
  const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);
  const [isFocused, setIsFocused] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const { addCapture, isSubmitting } = useCaptureStore();

  const onContentSizeChange = useCallback(
    (e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
      const h = e.nativeEvent.contentSize.height;
      setInputHeight(Math.min(Math.max(h, MIN_INPUT_HEIGHT), MAX_INPUT_HEIGHT));
    },
    [],
  );

  const submit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isSubmitting) return;

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addCapture(trimmed);

    // Clear input and reset height
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
  };
}
