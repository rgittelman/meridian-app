import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/typography/Text';
import { CaptureCard } from '@/components/capture/CaptureCard';
import type { LifeObject } from '@/types/capture';
import { spacing } from '@/theme';

type RecentCapturesProps = {
  items: LifeObject[];
  onItemPress?: (item: LifeObject) => void;
};

const MAX_RECENT = 8;

export function RecentCaptures({ items, onItemPress }: RecentCapturesProps) {
  if (items.length === 0) return null;

  const visible = items.slice(0, MAX_RECENT);

  return (
    <View style={styles.wrap}>
      <Text
        variant="caption"
        color="inkGhost"
        style={styles.sectionLabel}
        maxFontSizeMultiplier={1.1}
      >
        Recently captured
      </Text>

      <View style={styles.list}>
        {visible.map((item, index) => (
          <CaptureCard
            key={item.id}
            item={item}
            index={index}
            onPress={onItemPress}
          />
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
    letterSpacing: 0.3,
  },
  list: {
    gap: spacing[2] + 2,
  },
});
