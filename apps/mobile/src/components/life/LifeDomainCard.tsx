import { View } from 'react-native';

import { GradientCard } from '@/components/shared/surfaces/GradientCard';
import { DomainBadge } from '@/components/shared/primitives/DomainBadge';
import { StatusPill } from '@/components/shared/primitives/StatusPill';
import type { StatusSentiment } from '@/components/shared/primitives/StatusPill';
import { domainColorFor } from '@/components/calendar/planEventAccent';
import { Text } from '@/components/typography/Text';
import { useTheme } from '@/hooks/useTheme';
import { makeStyles, spacing } from '@/theme';
import type { AttentionLevel, LifeDomainSnapshot } from '@/types/life';

type LifeDomainCardProps = {
  domain: LifeDomainSnapshot;
  onPress: () => void;
};

function attentionToSentiment(level: AttentionLevel): StatusSentiment {
  switch (level) {
    case 'active':  return 'caution';
    case 'present': return 'positive';
    case 'quiet':   return 'neutral';
  }
}

function attentionLabel(level: AttentionLevel): string {
  switch (level) {
    case 'active':  return 'Active';
    case 'present': return 'Present';
    case 'quiet':   return 'Quiet';
  }
}

export function LifeDomainCard({ domain, onPress }: LifeDomainCardProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const accentColor = domainColorFor(colors, domain.id);
  const sentiment = attentionToSentiment(domain.attention.level);

  return (
    <GradientCard
      accentColor={accentColor}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: `${accentColor}18`,
          shadowColor: accentColor,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.18,
          shadowRadius: 8,
          elevation: 3,
        },
      ]}
    >
      <View style={styles.header}>
        <DomainBadge domain={domain.id} size="sm" variant="pill" />
        <StatusPill label={attentionLabel(domain.attention.level)} sentiment={sentiment} />
      </View>

      <View style={styles.previews}>
        {domain.previewLines.map((line, i) => (
          <Text
            key={`${domain.id}-${i}`}
            variant="footnote"
            color="inkSecondary"
            maxFontSizeMultiplier={1.1}
          >
            {line}
          </Text>
        ))}
        {domain.previewOverflowLine ? (
          <Text
            variant="footnote"
            color="inkGhost"
            style={styles.overflow}
            maxFontSizeMultiplier={1.05}
          >
            {domain.previewOverflowLine}
          </Text>
        ) : null}
      </View>
    </GradientCard>
  );
}

const useStyles = makeStyles(() => ({
  card: {
    // Width managed by grid container — GradientCard style prop merges here
    flex: 1,
    minWidth: 0,
    gap: spacing[3],
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    flexWrap: 'wrap' as const,
    gap: spacing[1],
  },
  previews: {
    gap: spacing[1],
  },
  overflow: {
    fontStyle: 'italic' as const,
    marginTop: spacing[1],
  },
}));
