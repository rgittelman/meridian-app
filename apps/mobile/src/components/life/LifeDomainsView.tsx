import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/typography/Text';
import { LifeDomainCard } from '@/components/life/LifeDomainCard';
import { LifeDomainDetailSheet } from '@/components/life/LifeDomainDetailSheet';
import { useLifeIntelligence } from '@/hooks/useLifeIntelligence';
import type { LifeDomainSnapshot } from '@/types/life';
import { makeStyles, spacing } from '@/theme';

export function LifeDomainsView() {
  const styles = useStyles();
  const snapshot = useLifeIntelligence();
  const [selected, setSelected] = useState<LifeDomainSnapshot | null>(null);

  const hasLiveData = useMemo(
    () => snapshot.domains.some((d) => d.hasActivity),
    [snapshot.domains],
  );

  const headline = hasLiveData
    ? 'Where your attention is living right now.'
    : 'Patterns become clearer over time.';

  const subline = hasLiveData
    ? 'Meridian reads your calendar and captures — not folders.'
    : "Your life isn't as scattered as it feels.";

  return (
    <View style={styles.wrap} accessibilityLabel="Life domains">
      <Text variant="caption" color="inkGhost" style={styles.eyebrow}>
        Your life
      </Text>

      <Text variant="display" color="ink" style={styles.headline}>
        {headline}
      </Text>

      <Text variant="body" color="inkSecondary" style={styles.subline}>
        {subline}
      </Text>

      <View style={styles.grid}>
        {snapshot.domains.filter((d) => d.hasActivity).map((domain) => (
          <LifeDomainCard
            key={domain.id}
            domain={domain}
            onPress={() => setSelected(domain)}
          />
        ))}
      </View>

      <View
        style={styles.divider}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />

      <Text variant="callout" color="inkGhost" style={styles.footer}>
        {hasLiveData
          ? 'Small consistency matters more than big plans.'
          : 'Connect calendar and capture a few things — domains will come alive.'}
      </Text>

      <LifeDomainDetailSheet
        visible={selected !== null}
        domain={selected}
        onClose={() => setSelected(null)}
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: {
    flex: 1,
    paddingBottom: spacing[10],
    gap: spacing[4],
  },
  eyebrow: { letterSpacing: 0.4, marginBottom: -spacing[1] },
  headline: { maxWidth: 320 },
  subline: { maxWidth: 300, marginTop: -spacing[1] },
  grid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: spacing[2] + 2,
    marginTop: spacing[3],
    marginBottom: spacing[1],
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
    marginTop: spacing[1],
    marginBottom: spacing[1],
  },
  footer: { maxWidth: 280 },
}));
