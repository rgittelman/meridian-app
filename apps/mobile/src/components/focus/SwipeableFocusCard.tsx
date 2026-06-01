/**
 * Meridian — SwipeableFocusCard
 *
 * Swipe RIGHT → Complete | Swipe LEFT → Later (opens sheet)
 * Visible Done / Later buttons sit outside the pan gesture.
 */

import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolate,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Check, Clock } from 'lucide-react-native';

import { FOCUS_ACTION_LABELS } from '@/constants/focusActions';
import { Text } from '@/components/typography/Text';
import {
  FocusCardActions,
  FocusCardBody,
  type FocusItem,
} from '@/components/focus/FocusCard';
import { useTheme } from '@/hooks/useTheme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { makeStyles, radius, spacing } from '@/theme';
import { springConfig } from '@/animations/motionTokens';
import { isIOS } from '@/utils/platform';

const COMMIT_THRESHOLD = 96;
const RESISTANCE = 0.72;
const VELOCITY_ASSIST = 700;
const SOFT_LIMIT = 60;
const EXIT_DISTANCE = 500;

const RETURN_SPRING = isIOS
  ? springConfig.cardReturn
  : { damping: 24, stiffness: 240, mass: 1.0 };

const EXIT_SPRING = isIOS
  ? springConfig.cardSettle
  : { damping: 20, stiffness: 200, mass: 0.9 };

type SwipeableFocusCardProps = {
  item: FocusItem;
  onComplete: (id: string, title: string) => void;
  onSnooze: (id: string) => void;
};

function hapticThreshold(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

function hapticComplete(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

function hapticSnooze(): void {
  Haptics.selectionAsync().catch(() => {});
}

export function SwipeableFocusCard({
  item,
  onComplete,
  onSnooze,
}: SwipeableFocusCardProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const reducedMotion = useReducedMotion();

  const translateX = useSharedValue(0);
  const thresholdHapticFired = useSharedValue(false);

  const urgency = item.urgency ?? 'default';
  const urgencySurface: Record<typeof urgency, string> = {
    default: colors.focusCardDefault,
    time: colors.focusCardPeople,
    warm: colors.focusCardUrgent,
  };

  const runComplete = useCallback(
    (id: string, title: string, animated: boolean) => {
      if (animated && !reducedMotion) {
        translateX.value = withSpring(EXIT_DISTANCE, EXIT_SPRING, () => {
          runOnJS(onComplete)(id, title);
        });
        hapticComplete();
      } else {
        hapticComplete();
        onComplete(id, title);
      }
    },
    [onComplete, reducedMotion, translateX],
  );

  const completeWithSwipeAnimation = useCallback(() => {
    runComplete(item.id, item.title, true);
  }, [item.id, item.title, runComplete]);

  const completeFromButton = useCallback(() => {
    runComplete(item.id, item.title, false);
  }, [item.id, item.title, runComplete]);

  const triggerSnooze = useCallback(() => {
    hapticSnooze();
    onSnooze(item.id);
  }, [item.id, onSnooze]);

  const pan = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .failOffsetY([-12, 12])
    .onStart(() => {
      thresholdHapticFired.value = false;
    })
    .onUpdate((e) => {
      const rawX = e.translationX;
      const sign = rawX >= 0 ? 1 : -1;
      const abs = Math.abs(rawX);
      const limited =
        abs <= SOFT_LIMIT ? abs : SOFT_LIMIT + (abs - SOFT_LIMIT) * RESISTANCE;
      translateX.value = sign * limited;

      if (
        !thresholdHapticFired.value &&
        Math.abs(translateX.value) >= COMMIT_THRESHOLD * 0.8
      ) {
        thresholdHapticFired.value = true;
        runOnJS(hapticThreshold)();
      }
    })
    .onEnd((e) => {
      const { translationX, velocityX } = e;
      const effectiveX = translationX + velocityX * (isIOS ? 0.08 : 0.06);

      if (effectiveX >= COMMIT_THRESHOLD || velocityX > VELOCITY_ASSIST) {
        runOnJS(completeWithSwipeAnimation)();
      } else if (effectiveX <= -COMMIT_THRESHOLD || velocityX < -VELOCITY_ASSIST) {
        translateX.value = withSpring(0, RETURN_SPRING, () => {
          runOnJS(triggerSnooze)();
        });
      } else {
        translateX.value = withSpring(0, RETURN_SPRING);
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    if (reducedMotion) {
      return {
        opacity: interpolate(
          Math.abs(translateX.value),
          [0, COMMIT_THRESHOLD],
          [1, 0.6],
          Extrapolate.CLAMP,
        ),
      };
    }
    return { transform: [{ translateX: translateX.value }] };
  });

  const completeAffordanceStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, COMMIT_THRESHOLD * 0.4, COMMIT_THRESHOLD],
      [0, 0.5, 1],
      Extrapolate.CLAMP,
    ),
  }));

  const snoozeAffordanceStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-COMMIT_THRESHOLD, -COMMIT_THRESHOLD * 0.4, 0],
      [1, 0.5, 0],
      Extrapolate.CLAMP,
    ),
  }));

  return (
    <View style={styles.container} accessible={false}>
      <View
        style={[styles.shell, { backgroundColor: urgencySurface[urgency] }]}
      >
        <View style={styles.swipeLayer}>
          <Animated.View
            style={[
              styles.affordance,
              styles.affordanceComplete,
              completeAffordanceStyle,
            ]}
            pointerEvents="none"
          >
            <Check
              size={18}
              color={colors.actionCompleteFg}
              strokeWidth={2.5}
              aria-hidden
            />
            <Text
              variant="footnote"
              style={[styles.affordanceLabel, { color: colors.actionCompleteFg }]}
              maxFontSizeMultiplier={1.0}
            >
              {FOCUS_ACTION_LABELS.handled}
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.affordance,
              styles.affordanceSnooze,
              snoozeAffordanceStyle,
            ]}
            pointerEvents="none"
          >
            <Text
              variant="footnote"
              style={[styles.affordanceLabel, { color: colors.actionSnoozeFg }]}
              maxFontSizeMultiplier={1.0}
            >
              {FOCUS_ACTION_LABELS.hold}
            </Text>
            <Clock
              size={18}
              color={colors.actionSnoozeFg}
              strokeWidth={2}
              aria-hidden
            />
          </Animated.View>

          <GestureDetector gesture={pan}>
            <Animated.View
              style={[
                styles.bodyWrap,
                cardStyle,
                { backgroundColor: urgencySurface[urgency] },
              ]}
            >
              <FocusCardBody item={item} />
            </Animated.View>
          </GestureDetector>
        </View>

        <FocusCardActions
          title={item.title}
          onComplete={completeFromButton}
          onLater={triggerSnooze}
        />
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  container: {
    position: 'relative' as const,
  },
  shell: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden' as const,
  },
  swipeLayer: {
    position: 'relative' as const,
  },
  affordance: {
    position: 'absolute' as const,
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing[4],
  },
  affordanceComplete: {
    backgroundColor: c.actionCompleteBg,
    justifyContent: 'flex-start' as const,
    gap: spacing[2],
  },
  affordanceSnooze: {
    backgroundColor: c.actionSnoozeBg,
    justifyContent: 'flex-end' as const,
    gap: spacing[2],
  },
  affordanceLabel: {
    fontWeight: '500' as const,
  },
  bodyWrap: {
    zIndex: 1,
    backgroundColor: 'transparent',
  },
}));
