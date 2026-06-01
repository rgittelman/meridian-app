import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Text } from '@/components/typography/Text';
import { colors, minTouchTarget, radius, spacing } from '@/theme';
import { springConfig } from '@/animations/motionTokens';

export type FocusItemUrgency = 'default' | 'time' | 'warm';

export type FocusItem = {
  id: string;
  title: string;
  /** Person name this item is associated with */
  person?: string;
  /** Short time string, e.g. "5:15 PM" */
  time?: string;
  urgency?: FocusItemUrgency;
  /** Whether this item has been marked complete — future use */
  completed?: boolean;
};

type FocusCardProps = {
  item: FocusItem;
  onPress?: (item: FocusItem) => void;
};

const URGENCY_DOT: Record<FocusItemUrgency, string> = {
  default: colors.inkGhost,
  time: colors.accent,
  warm: colors.warning,
};

const URGENCY_SURFACE: Record<FocusItemUrgency, string> = {
  default: colors.focusCardDefault,
  time: colors.focusCardPeople,
  warm: colors.focusCardUrgent,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function FocusCard({ item, onPress }: FocusCardProps) {
  const scale = useSharedValue(1);
  const urgency = item.urgency ?? 'default';

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.982, springConfig.gentle);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, springConfig.gentle);
  }, [scale]);

  const handlePress = useCallback(() => {
    onPress?.(item);
  }, [item, onPress]);

  const hasMeta = Boolean(item.person || item.time);

  return (
    /**
     * Swipe-ready: wrap in GestureDetector + pan gesture here in a future pass.
     * The translateX shared value and gesture handler infrastructure lives here.
     */
    <AnimatedPressable
      style={[styles.card, { backgroundColor: URGENCY_SURFACE[urgency] }, animStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={item.title}
      accessibilityHint={hasMeta ? [item.person, item.time].filter(Boolean).join(' · ') : undefined}
    >
      {/* Urgency dot */}
      <View style={styles.dotWrap} accessibilityElementsHidden importantForAccessibility="no">
        <View style={[styles.dot, { backgroundColor: URGENCY_DOT[urgency] }]} />
      </View>

      {/* Content */}
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
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    minHeight: minTouchTarget + spacing[2],
    gap: spacing[3],
  },
  dotWrap: {
    paddingTop: 5,
    width: 8,
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  personPill: {
    backgroundColor: colors.peoplePill,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  personText: {
    color: colors.peoplePillText,
    fontSize: 12,
    fontWeight: '500',
  },
});
