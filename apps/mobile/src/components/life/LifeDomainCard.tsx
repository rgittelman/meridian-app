import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/typography/Text';
import { useTheme } from '@/hooks/useTheme';
import type { LifeDomainSnapshot } from '@/types/life';
import { LIFE_DOMAIN_DEFINITIONS } from '@/services/life/constants';
import { makeStyles, radius, spacing } from '@/theme';

type LifeDomainCardProps = {
  domain: LifeDomainSnapshot;
  onPress: () => void;
};

export function LifeDomainCard({ domain, onPress }: LifeDomainCardProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const def = LIFE_DOMAIN_DEFINITIONS.find((d) => d.id === domain.id);
  const Icon = def?.Icon;
  const isActive = domain.attention.level === 'active';
  const isPresent = domain.attention.level === 'present';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        (isActive || isPresent) && styles.cardPresent,
        pressed && styles.cardPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${domain.label}. ${domain.previewLines[0] ?? ''}`}
    >
      <View style={styles.header}>
        {Icon ? <Icon size={18} color={colors.inkTertiary} strokeWidth={1.75} /> : null}
        <Text variant="callout" color="inkSecondary" style={styles.label}>
          {domain.label}
        </Text>
        {(isActive || isPresent) && (
          <View
            style={[styles.lifeBar, isActive && styles.lifeBarActive]}
            accessibilityElementsHidden
          />
        )}
      </View>

      <View style={styles.previews}>
        {domain.previewLines.map((line, i) => (
          <Text
            key={`${domain.id}-${i}`}
            variant="footnote"
            style={styles.previewLine}
            maxFontSizeMultiplier={1.1}
          >
            {line}
          </Text>
        ))}
        {domain.previewOverflowLine ? (
          <Text variant="footnote" style={styles.overflowLine} maxFontSizeMultiplier={1.05}>
            {domain.previewOverflowLine}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  card: {
    width: '47.5%' as unknown as number,
    backgroundColor: c.lifeCategoryBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.lifeCategoryBorder,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
    gap: spacing[2],
  },
  cardPresent: {
    borderColor: c.lifeDomainBorderActive,
  },
  cardPressed: {
    backgroundColor: c.surfaceMuted,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing[2],
  },
  label: {
    flex: 1,
  },
  lifeBar: {
    width: 20,
    height: 2,
    borderRadius: radius.full,
    backgroundColor: c.insightSoft,
  },
  lifeBarActive: {
    backgroundColor: c.lifeDomainActiveBar,
  },
  previews: {
    gap: spacing[1],
    marginTop: spacing[1],
  },
  previewLine: {
    color: c.lifeDomainPreview,
    flexShrink: 1,
  },
  overflowLine: {
    color: c.inkGhost,
    fontStyle: 'italic' as const,
    marginTop: spacing[1],
  },
}));
