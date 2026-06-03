import { View } from 'react-native';

import { Text } from '@/components/typography/Text';
import { domainColorFor } from '@/components/calendar/planEventAccent';
import { makeStyles, radius, spacing } from '@/theme';
import { useTheme } from '@/hooks/useTheme';
import type { LifeDomainId } from '@/types/life';

const DOMAIN_LABELS: Record<LifeDomainId, string> = {
  family:    'Family',
  work:      'Work',
  health:    'Health',
  personal:  'Personal',
  community: 'Community',
};

type DomainBadgeProps = {
  domain: LifeDomainId;
  size?: 'sm' | 'md';
  variant?: 'dot' | 'pill';
};

export function DomainBadge({ domain, size = 'md', variant = 'pill' }: DomainBadgeProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const accentColor = domainColorFor(colors, domain);

  if (variant === 'dot') {
    const dotSize = size === 'sm' ? 6 : 8;
    return (
      <View
        style={[
          styles.dot,
          { width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: accentColor },
        ]}
        accessibilityLabel={DOMAIN_LABELS[domain]}
      />
    );
  }

  return (
    <View style={[styles.pill, { backgroundColor: `${accentColor}20` }]}>
      <View style={[styles.pillDot, { backgroundColor: accentColor }]} />
      <Text
        variant={size === 'sm' ? 'footnote' : 'caption'}
        style={{ color: accentColor }}
        weight="medium"
      >
        {DOMAIN_LABELS[domain]}
      </Text>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  dot: {
    flexShrink: 0,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    gap: spacing[1],
  },
  pillDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
}));
