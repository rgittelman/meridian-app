import { type ReactNode, useEffect } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { screenFade } from '@/animations/motionTokens';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import {
  colors,
  screenPaddingHorizontal,
  screenPaddingTop,
  spacing,
  tabBarHeight,
  tabBarBottomInset,
} from '@/theme';

type ScreenContainerProps = {
  children: ReactNode;
  scrollable?: boolean;
  /** Extra bottom padding for floating tab bar */
  withTabBarInset?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  testID?: string;
};

export function ScreenContainer({
  children,
  scrollable = false,
  withTabBarInset = true,
  style,
  contentStyle,
  testID,
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(reducedMotion ? 1 : 0);
  const translateY = useSharedValue(reducedMotion ? 0 : screenFade.from.translateY);

  useEffect(() => {
    if (reducedMotion) return;
    opacity.value = withTiming(1, { duration: screenFade.duration });
    translateY.value = withTiming(0, { duration: screenFade.duration });
  }, [opacity, reducedMotion, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const bottomPad =
    (withTabBarInset ? tabBarHeight + tabBarBottomInset + spacing[4] : spacing[6]) +
    insets.bottom;

  const paddingStyle = {
    paddingTop: insets.top + screenPaddingTop,
    paddingBottom: bottomPad,
    paddingHorizontal: screenPaddingHorizontal,
  };

  const content = (
    <Animated.View
      style={[
        scrollable ? styles.innerScroll : styles.inner,
        paddingStyle,
        animatedStyle,
        contentStyle,
      ]}
    >
      {children}
    </Animated.View>
  );

  if (scrollable) {
    return (
      <View style={[styles.root, style]} testID={testID}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          overScrollMode="never"
        >
          {content}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.root, style]} testID={testID}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  inner: {
    flex: 1,
  },
  /** Inside ScrollView — do not set flex:1; let height grow naturally */
  innerScroll: {},
});
