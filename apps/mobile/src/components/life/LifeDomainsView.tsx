import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { GradientCard } from '@/components/shared/surfaces/GradientCard';
import { LifeBalanceChart } from '@/components/shared/metrics/LifeBalanceChart';
import { WeeklyActivityBar } from '@/components/shared/metrics/WeeklyActivityBar';
import { Text } from '@/components/typography/Text';
import { LifeDomainCard } from '@/components/life/LifeDomainCard';
import { LifeDomainDetailSheet } from '@/components/life/LifeDomainDetailSheet';
import {
  deriveWeeklyActivityDays,
  deriveBalanceSegments,
  deriveLifeHeadline,
  deriveTopDomainLabels,
} from '@/components/life/lifeSummary';
import { useLifeIntelligence } from '@/hooks/useLifeIntelligence';
import { useCalendarStore } from '@/store/calendarStore';
import { makeStyles, spacing } from '@/theme';
import type { LifeDomainSnapshot } from '@/types/life';

export function LifeDomainsView() {
  const styles = useStyles();
  const snapshot = useLifeIntelligence();
  const weekEvents = useCalendarStore((s) => s.weekEvents);
  const [selected, setSelected] = useState<LifeDomainSnapshot | null>(null);

  const activeDomains = useMemo(
    () => snapshot.domains.filter((d) => d.hasActivity),
    [snapshot.domains],
  );
  const hasActivity = activeDomains.length > 0;

  const balanceSegments = useMemo(
    () => deriveBalanceSegments(activeDomains),
    [activeDomains],
  );

  const activityDays = useMemo(
    () => deriveWeeklyActivityDays(weekEvents, snapshot.attentionByDomain, new Date()),
    [weekEvents, snapshot.attentionByDomain],
  );

  const topLabels = useMemo(
    () => deriveTopDomainLabels(activeDomains),
    [activeDomains],
  );

  const headline = deriveLifeHeadline(activeDomains.length, hasActivity, topLabels);

  const displayDomains = hasActivity ? activeDomains : snapshot.domains;

  return (
    <View style={styles.wrap} accessibilityLabel="Life domains">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <Text variant="caption" color="inkGhost" style={styles.eyebrow}>
        Your life
      </Text>
      <Text variant="display" color="ink" style={styles.headline}>
        {headline}
      </Text>

      {/* ── Summary card: donut + weekly bars ──────────────────────────── */}
      {hasActivity && (
        <GradientCard style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text variant="caption" color="inkTertiary" weight="medium" style={styles.summaryLabel}>
              Life balance
            </Text>
            <Text variant="footnote" color="inkGhost">
              This week
            </Text>
          </View>
          <View style={styles.summaryBody}>
            <View style={styles.donutWrap}>
              <LifeBalanceChart segments={balanceSegments} size={80} />
              <Text variant="footnote" color="inkGhost" align="center" style={styles.donutHint}>
                By area
              </Text>
            </View>
            <View style={styles.barsWrap}>
              <WeeklyActivityBar days={activityDays} />
            </View>
          </View>
        </GradientCard>
      )}

      {/* ── Domain cards grid ──────────────────────────────────────────── */}
      <View style={styles.grid}>
        {displayDomains.map((domain, index) => {
          // If there's an odd number of domains, the last card spans full width
          // so it doesn't sit orphaned in a half-width cell.
          const isLastOdd =
            displayDomains.length % 2 === 1 && index === displayDomains.length - 1;
          return (
            <View key={domain.id} style={[styles.gridItem, isLastOdd && styles.gridItemFull]}>
              <LifeDomainCard
                domain={domain}
                onPress={() => setSelected(domain)}
              />
            </View>
          );
        })}
      </View>

      <View
        style={styles.divider}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />

      <Text variant="callout" color="inkGhost" style={styles.footer}>
        {hasActivity
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
  eyebrow: {
    letterSpacing: 0.4,
    marginBottom: -spacing[1],
  },
  headline: {
    maxWidth: 320,
  },
  summaryCard: {
    gap: spacing[3],
  },
  summaryHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  summaryLabel: {
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  summaryBody: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing[4],
  },
  donutWrap: {
    alignItems: 'center' as const,
    gap: spacing[1],
  },
  donutHint: {
    marginTop: -spacing[1],
  },
  barsWrap: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: spacing[2] + 2,
    marginTop: spacing[1],
    marginBottom: spacing[1],
  },
  gridItem: {
    width: '47.5%' as unknown as number,
  },
  gridItemFull: {
    width: '100%' as unknown as number,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
    marginTop: spacing[1],
    marginBottom: spacing[1],
  },
  footer: {
    maxWidth: 280,
  },
}));
