import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/typography/Text';
import { colors, radius, screenPaddingHorizontal, spacing } from '@/theme';

const EXAMPLES = [
  'Need to call school tomorrow',
  'Pick up Grace at 5:15',
  'Pay camp deposit Friday',
  'Easier dinners this week',
  'Mom birthday gift',
  "Doctor's appointment soon",
] as const;

type SuggestedExamplesProps = {
  onSelect: (text: string) => void;
};

export function SuggestedExamples({ onSelect }: SuggestedExamplesProps) {
  return (
    <View style={styles.wrap}>
      <Text
        variant="caption"
        color="inkGhost"
        style={[styles.label, { paddingHorizontal: screenPaddingHorizontal }]}
        maxFontSizeMultiplier={1.1}
      >
        Examples — tap to try
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        accessibilityRole="list"
        accessibilityLabel="Capture examples"
      >
        {EXAMPLES.map((example) => (
          <Pressable
            key={example}
            onPress={() => onSelect(example)}
            style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Example: ${example}`}
          >
            <Text
              variant="callout"
              style={styles.chipText}
              numberOfLines={1}
              maxFontSizeMultiplier={1.1}
            >
              {example}
            </Text>
          </Pressable>
        ))}
        <View style={styles.trailing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing[2],
  },
  label: {
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  scrollContent: {
    paddingLeft: screenPaddingHorizontal,
    gap: spacing[2],
    alignItems: 'center',
  },
  trailing: {
    width: screenPaddingHorizontal - spacing[2],
  },
  chip: {
    backgroundColor: colors.exampleChip,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.exampleChipBorder,
    borderRadius: radius.full,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2] + 2,
  },
  chipPressed: {
    backgroundColor: colors.accentSoft,
  },
  chipText: {
    color: colors.exampleChipText,
  },
});
