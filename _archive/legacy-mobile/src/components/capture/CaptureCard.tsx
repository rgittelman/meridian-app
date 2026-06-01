import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Pressable } from 'react-native';

import { Text } from '@/components/typography/Text';
import { springConfig } from '@/animations/motionTokens';
import type { LifeObject } from '@/types/capture';
import { colors, radius, spacing } from '@/theme';

type CaptureCardProps = {
  item: LifeObject;
  index: number;
  onPress?: (item: LifeObject) => void;
};

const CATEGORY_LABELS: Partial<Record<string, string>> = {
  family: 'Family',
  financial: 'Financial',
  household: 'Home',
  work: 'Work',
  health: 'Health',
  personal: 'Personal',
};

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'Just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function CaptureCard({ item, index, onPress }: CaptureCardProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const category = item.parse.category;
  const topPerson = item.parse.people[0];
  const hasPill = Boolean(category || topPerson);

  return (
    /**
     * Swipe-to-dismiss: add GestureDetector + horizontal pan here
     * in a future pass (translateX shared value already implied).
     */
    <Animated.View
      entering={FadeInUp.delay(index * 50).duration(280).springify()}
    >
      <AnimatedPressable
        onPressIn={() => { scale.value = withSpring(0.982, springConfig.gentle); }}
        onPressOut={() => { scale.value = withSpring(1, springConfig.gentle); }}
        onPress={() => onPress?.(item)}
        style={[styles.card, animStyle]}
        accessibilityRole="button"
        accessibilityLabel={item.raw}
      >
        <View style={styles.row}>
          <Text
            variant="body"
            color="inkSecondary"
            style={styles.rawText}
            numberOfLines={2}
            maxFontSizeMultiplier={1.2}
          >
            {item.raw}
          </Text>
          <Text
            variant="footnote"
            color="inkGhost"
            style={styles.time}
            maxFontSizeMultiplier={1.0}
          >
            {formatRelativeTime(item.createdAt)}
          </Text>
        </View>

        {hasPill && (
          <View style={styles.pillRow}>
            {category && category.confidence !== 'low' && (
              <View style={styles.pill}>
                <Text variant="footnote" style={styles.pillText} maxFontSizeMultiplier={1.0}>
                  {CATEGORY_LABELS[category.value] ?? category.value}
                </Text>
              </View>
            )}
            {topPerson && topPerson.confidence !== 'low' && (
              <View style={[styles.pill, styles.personPill]}>
                <Text variant="footnote" style={styles.personPillText} maxFontSizeMultiplier={1.0}>
                  {topPerson.value}
                </Text>
              </View>
            )}
          </View>
        )}
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.captureCardBg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.captureCardBorder,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3] + 2,
    gap: spacing[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  rawText: {
    flex: 1,
  },
  time: {
    flexShrink: 0,
    paddingTop: 2,
  },
  pillRow: {
    flexDirection: 'row',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  pill: {
    backgroundColor: colors.categoryPill,
    borderRadius: radius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
  },
  pillText: {
    color: colors.categoryPillText,
    fontSize: 11,
  },
  personPill: {
    backgroundColor: colors.peoplePill,
  },
  personPillText: {
    color: colors.peoplePillText,
    fontSize: 11,
  },
});
