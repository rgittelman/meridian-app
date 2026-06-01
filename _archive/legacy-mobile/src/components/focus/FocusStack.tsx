import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/typography/Text';
import { FocusCard, type FocusItem } from '@/components/focus/FocusCard';
import {
  MOCK_FOCUS_SCENARIO,
  assertPriorityOrder,
  debugPriority,
  sortByPriority,
  type FocusItemData,
  type OverloadState,
} from '@/services/priority';
import { spacing } from '@/theme';

type FocusStackProps = {
  /**
   * Rich domain items with intelligence metadata.
   * Defaults to the canonical mock scenario so the screen is immediately
   * demonstrating people-aware ordering before real data exists.
   */
  items?: FocusItemData[];
  /** User's current cognitive / emotional load — adjusts scoring weights */
  overloadState?: OverloadState;
  onItemPress?: (item: FocusItem) => void;
};

export function FocusStack({
  items = MOCK_FOCUS_SCENARIO,
  overloadState = 'MEDIUM',
  onItemPress,
}: FocusStackProps) {
  // Score + rank — memoized so it doesn't re-run on unrelated renders
  const scored = useMemo(
    () => sortByPriority(items, overloadState),
    [items, overloadState],
  );

  // Dev: log priority breakdown and assert ordering matches expected spec
  useEffect(() => {
    debugPriority(scored);
    assertPriorityOrder(scored, [
      'mock-grace-pickup',
      'mock-payment',
      'mock-budget-deck',
    ]);
  }, [scored]);

  // Map scored items → FocusCard's visual FocusItem type
  const cardItems: FocusItem[] = scored.map((s) => ({
    id: s.id,
    title: s.title,
    person: s.person,
    time: s.time,
    completed: s.completed,
    urgency: s.visualUrgency,
  }));

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

      <View style={styles.cardList}>
        {cardItems.map((item) => (
          <FocusCard key={item.id} item={item} onPress={onItemPress} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing[3],
  },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  cardList: {
    gap: spacing[2] + 2,
  },
});
