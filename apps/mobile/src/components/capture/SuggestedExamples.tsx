import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/typography/Text';
import { makeStyles, radius, screenPaddingHorizontal, spacing } from '@/theme';

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
  const styles = useStyles();

  return (
    <View style={staticStyles.wrap}>
      <Text
        variant="caption"
        color="inkGhost"
        style={[staticStyles.label, { paddingHorizontal: screenPaddingHorizontal }]}
        maxFontSizeMultiplier={1.1}
      >
        Examples — tap to try
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={staticStyles.scrollContent}
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
        <View style={staticStyles.trailing} />
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  chip: {
    backgroundColor: c.exampleChip,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.exampleChipBorder,
    borderRadius: radius.full,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2] + 2,
  },
  chipPressed: {
    backgroundColor: c.accentSoft,
  },
  chipText: {
    color: c.exampleChipText,
  },
}));

const staticStyles = StyleSheet.create({
  wrap: { gap: spacing[2] },
  label: { letterSpacing: 0.3 },
  scrollContent: {
    paddingLeft: screenPaddingHorizontal,
    gap: spacing[2],
    alignItems: 'center' as const,
  },
  trailing: { width: screenPaddingHorizontal - spacing[2] },
});
