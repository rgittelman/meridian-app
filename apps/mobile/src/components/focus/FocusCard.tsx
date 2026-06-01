import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Check, Clock } from 'lucide-react-native';

import { Text } from '@/components/typography/Text';
import {
  FOCUS_ACTION_LABELS,
  focusActionA11yHandled,
  focusActionA11yHold,
} from '@/constants/focusActions';
import { useTheme } from '@/hooks/useTheme';
import { makeStyles, minTouchTarget, radius, spacing } from '@/theme';
import { motionDuration, springConfig } from '@/animations/motionTokens';

export type FocusItemUrgency = 'default' | 'time' | 'warm';

export type FocusItem = {
  id: string;
  title: string;
  person?: string;
  time?: string;
  urgency?: FocusItemUrgency;
  completed?: boolean;
};

type FocusCardProps = {
  item: FocusItem;
  onPress?: (item: FocusItem) => void;
  /** Visible Done — same handler as swipe-right complete */
  onComplete?: () => void;
  /** Visible Later — same handler as swipe-left snooze */
  onLater?: () => void;
  /**
   * When true, render only the body (no shell border).
   * Used inside SwipeableFocusCard where the shell wraps body + actions.
   */
  bodyOnly?: boolean;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Card body: title, meta, optional press — gesture-safe content area */
export function FocusCardBody({ item, onPress }: Pick<FocusCardProps, 'item' | 'onPress'>) {
  const { colors } = useTheme();
  const styles = useStyles();
  const scale = useSharedValue(1);
  const urgency = item.urgency ?? 'default';

  const urgencyDot: Record<FocusItemUrgency, string> = {
    default: colors.inkGhost,
    time: colors.accent,
    warm: colors.warning,
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    if (!onPress) return;
    scale.value = withSpring(0.982, springConfig.gentle);
  }, [onPress, scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, springConfig.gentle);
  }, [scale]);

  const hasMeta = Boolean(item.person || item.time);
  const content = (
    <>
      <View style={styles.dotWrap} accessibilityElementsHidden importantForAccessibility="no">
        <View style={[styles.dot, { backgroundColor: urgencyDot[urgency] }]} />
      </View>
      <View style={styles.content}>
        <Text
          variant="subhead"
          color="ink"
          style={styles.title}
          maxFontSizeMultiplier={1.25}
          numberOfLines={2}
        >
          {item.title}
        </Text>
        {hasMeta && (
          <View style={styles.metaRow}>
            {item.person && (
              <View style={styles.personPill}>
                <Text variant="footnote" style={styles.personText} maxFontSizeMultiplier={1.1}>
                  {item.person}
                </Text>
              </View>
            )}
            {item.time && (
              <Text variant="footnote" color="inkTertiary" maxFontSizeMultiplier={1.1}>
                {item.time}
              </Text>
            )}
          </View>
        )}
      </View>
    </>
  );

  if (onPress) {
    return (
      <AnimatedPressable
        style={[styles.bodyRow, animStyle]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => onPress(item)}
        accessibilityRole="button"
        accessibilityLabel={item.title}
        accessibilityHint={
          hasMeta ? [item.person, item.time].filter(Boolean).join(' · ') : undefined
        }
      >
        {content}
      </AnimatedPressable>
    );
  }

  return (
    <View
      style={styles.bodyRow}
      accessibilityLabel={item.title}
      accessibilityHint={
        hasMeta ? [item.person, item.time].filter(Boolean).join(' · ') : undefined
      }
    >
      {content}
    </View>
  );
}

type FocusActionVariant = 'hold' | 'handled';

type FocusActionButtonProps = {
  variant: FocusActionVariant;
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
};

/** Calm tap target — opacity press only, no scale */
function FocusActionButton({
  variant,
  label,
  onPress,
  accessibilityLabel,
}: FocusActionButtonProps) {
  const { colors } = useTheme();
  const styles = useActionStyles();
  const opacity = useSharedValue(1);
  const isHandled = variant === 'handled';

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    opacity.value = withTiming(0.62, { duration: motionDuration.instant });
  };

  const handlePressOut = () => {
    opacity.value = withTiming(1, { duration: motionDuration.fast });
  };

  const handlePress = () => {
    if (isHandled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } else {
      Haptics.selectionAsync().catch(() => {});
    }
    onPress();
  };

  const Icon = isHandled ? Check : Clock;
  const iconColor = isHandled ? colors.focusActionHandledText : colors.focusActionHoldText;

  return (
    <AnimatedPressable
      style={[
        styles.actionBtn,
        isHandled ? styles.actionHandled : styles.actionHold,
        animStyle,
      ]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Icon size={15} color={iconColor} strokeWidth={isHandled ? 2.5 : 2} aria-hidden />
      <Text
        variant="footnote"
        style={isHandled ? styles.handledText : styles.holdText}
        maxFontSizeMultiplier={1.1}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

/**
 * Hold + Handled — same language as swipe affordances.
 * Hold: secondary, neutral. Handled: primary, quietly warm.
 */
export function FocusCardActions({
  title,
  onComplete,
  onLater,
}: {
  title: string;
  onComplete: () => void;
  onLater: () => void;
}) {
  const styles = useStyles();

  return (
    <View style={styles.actionsStrip}>
      <FocusActionButton
        variant="hold"
        label={FOCUS_ACTION_LABELS.hold}
        onPress={onLater}
        accessibilityLabel={focusActionA11yHold(title)}
      />
      <FocusActionButton
        variant="handled"
        label={FOCUS_ACTION_LABELS.handled}
        onPress={onComplete}
        accessibilityLabel={focusActionA11yHandled(title)}
      />
    </View>
  );
}

export function FocusCard({
  item,
  onPress,
  onComplete,
  onLater,
  bodyOnly = false,
}: FocusCardProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const urgency = item.urgency ?? 'default';
  const showActions = Boolean(onComplete && onLater);

  const urgencySurface: Record<FocusItemUrgency, string> = {
    default: colors.focusCardDefault,
    time: colors.focusCardPeople,
    warm: colors.focusCardUrgent,
  };

  if (bodyOnly) {
    return <FocusCardBody item={item} onPress={onPress} />;
  }

  return (
    <View
      style={[styles.shell, { backgroundColor: urgencySurface[urgency] }]}
    >
      <FocusCardBody item={item} onPress={onPress} />
      {showActions && (
        <FocusCardActions
          title={item.title}
          onComplete={onComplete!}
          onLater={onLater!}
        />
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  shell: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden' as const,
  },
  bodyRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    gap: spacing[3],
    minHeight: 56,
  },
  dotWrap: {
    paddingTop: 5,
    width: 8,
    alignItems: 'center' as const,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radius.full,
  },
  content: {
    flex: 1,
    gap: spacing[1] + 2,
  },
  title: {
    lineHeight: 24,
  },
  metaRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing[2],
    flexWrap: 'wrap' as const,
  },
  personPill: {
    backgroundColor: c.peoplePill,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  personText: {
    color: c.peoplePillText,
    fontSize: 12,
    fontWeight: '500' as const,
  },
  actionsStrip: {
    flexDirection: 'row' as const,
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    paddingTop: spacing[2] + 2,
    backgroundColor: c.focusActionStripBg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderSubtle,
  },
}));

const useActionStyles = makeStyles((c) => ({
  actionBtn: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing[2],
    minHeight: minTouchTarget,
    paddingVertical: spacing[2] + 2,
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionHold: {
    backgroundColor: c.focusActionHoldBg,
    borderColor: c.focusActionHoldBorder,
  },
  actionHandled: {
    backgroundColor: c.focusActionHandledBg,
    borderColor: c.focusActionHandledBorder,
  },
  holdText: {
    color: c.focusActionHoldText,
    fontWeight: '400' as const,
    letterSpacing: 0.15,
  },
  handledText: {
    color: c.focusActionHandledText,
    fontWeight: '500' as const,
    letterSpacing: 0.1,
  },
}));
