import { useMemo } from 'react';
import { View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { Text } from '@/components/typography/Text';
import { FocusCard, type FocusItem } from '@/components/focus/FocusCard';
import { SwipeableFocusCard } from '@/components/focus/SwipeableFocusCard';
import {
  MOCK_FOCUS_SCENARIO,
  sortByPriority,
  type FocusItemData,
  type OverloadState,
} from '@/services/priority';
import type { ResurfacedItem } from '@/services/resurfacing/types';
import { FOCUS_MAX } from '@/constants/focus';
import { isAllowedPersonPill } from '@/utils/parsing/pillRules';
import { makeStyles, spacing } from '@/theme';

function personForFocusCard(name: string | undefined): string | undefined {
  if (!name || !isAllowedPersonPill(name)) return undefined;
  return name;
}

type FocusStackProps = {
  /**
   * Pre-orchestrated resurfaced items — already ordered and paced.
   * When provided, used directly without re-scoring.
   */
  resurfacedItems?: ResurfacedItem[];
  /** When true, never fall back to dev mock placeholders */
  hasCaptures?: boolean;
  /**
   * Legacy: raw FocusItemData passed through the priority scorer.
   * Falls back to mock scenario if neither prop is provided.
   */
  items?: FocusItemData[];
  overloadState?: OverloadState;
  /**
   * Ambient insight or recovery message — shown subtly above cards.
   * Null most of the time.
   */
  insight?: string | null;
  /** When provided, renders SwipeableFocusCard with gesture support */
  onItemComplete?: (id: string, title: string) => void;
  /** When provided, renders SwipeableFocusCard with snooze gesture */
  onItemSnooze?: (id: string) => void;
};

export function FocusStack({
  resurfacedItems,
  hasCaptures = false,
  items,
  overloadState = 'MEDIUM',
  insight,
  onItemComplete,
  onItemSnooze,
}: FocusStackProps) {
  const styles = useStyles();
  const isGestureEnabled = Boolean(onItemComplete && onItemSnooze);

  const cardItems = useMemo<FocusItem[]>(() => {
    // Path 1: resurfaced items — already ordered by orchestration engine
    if (resurfacedItems !== undefined) {
      return resurfacedItems.slice(0, FOCUS_MAX).map((r) => ({
        id: r.id,
        title: r.title,
        person: personForFocusCard(r.person),
        time: r.time,
        urgency: r.visualUrgency,
        completed: false,
      }));
    }

    // Path 2: legacy FocusItemData — run through priority scorer
    const source =
      items && items.length > 0
        ? items
        : hasCaptures
          ? []
          : MOCK_FOCUS_SCENARIO;
    return sortByPriority(source, overloadState, FOCUS_MAX).map((s) => ({
      id: s.id,
      title: s.title,
      person: personForFocusCard(s.person),
      time: s.time,
      completed: s.completed,
      urgency: s.visualUrgency,
    }));
  }, [resurfacedItems, hasCaptures, items, overloadState]);

  return (
    <View style={styles.wrap}>
      <Text
        variant="caption"
        color="inkTertiary"
        style={styles.sectionLabel}
        maxFontSizeMultiplier={1.1}
      >
        What matters now
      </Text>

      {/* Ambient insight or recovery message — very subtle */}
      {insight ? (
        <Text
          variant="footnote"
          style={styles.insight}
          maxFontSizeMultiplier={1.1}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {insight}
        </Text>
      ) : null}

      {/* Card list — layout animation handles smooth reflow on removal */}
      <Animated.View style={styles.cardList} layout={LinearTransition.springify().damping(22).stiffness(200)}>
        {cardItems.map((item) =>
          isGestureEnabled ? (
            <Animated.View key={item.id} layout={LinearTransition.springify().damping(22).stiffness(200)}>
              <SwipeableFocusCard
                item={item}
                onComplete={onItemComplete!}
                onSnooze={onItemSnooze!}
              />
            </Animated.View>
          ) : (
            <FocusCard key={item.id} item={item} />
          ),
        )}
      </Animated.View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: {
    gap: spacing[3],
  },
  sectionLabel: {
    letterSpacing: 0.3,
  },
  insight: {
    letterSpacing: 0.1,
    lineHeight: 18,
    color: c.orchestrationRecovery,
  },
  cardList: {
    gap: spacing[2] + 2,
  },
}));
