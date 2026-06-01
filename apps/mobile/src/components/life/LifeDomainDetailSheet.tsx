import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/typography/Text';
import { useTheme } from '@/hooks/useTheme';
import type { LifeDomainSnapshot } from '@/types/life';
import { previewLineForCommitment } from '@/services/life/buildCommitments';
import { LIFE_DOMAIN_DEFINITIONS } from '@/services/life/constants';
import { makeStyles, radius, spacing } from '@/theme';

type LifeDomainDetailSheetProps = {
  visible: boolean;
  domain: LifeDomainSnapshot | null;
  onClose: () => void;
};

function SectionTitle({ children }: { children: string }) {
  const styles = useSectionStyles();
  return (
    <Text variant="caption" color="inkGhost" style={styles.title}>
      {children}
    </Text>
  );
}

export function LifeDomainDetailSheet({
  visible,
  domain,
  onClose,
}: LifeDomainDetailSheetProps) {
  const { colors } = useTheme();
  const styles = useStyles();

  if (!domain) return null;

  const def = LIFE_DOMAIN_DEFINITIONS.find((d) => d.id === domain.id);
  const Icon = def?.Icon;

  const upcomingEvents = domain.upcomingCommitments.filter((c) => c.kind === 'event');
  const captures = domain.activeCaptures;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            {Icon ? (
              <View style={styles.iconWrap}>
                <Icon size={22} color={colors.inkTertiary} strokeWidth={1.75} />
              </View>
            ) : null}
            <Text variant="display" color="ink" maxFontSizeMultiplier={1.12}>
              {domain.label}
            </Text>
          </View>

          {domain.id === 'family' && domain.peopleAnchors.length > 0 && (
            <View style={styles.block}>
              <SectionTitle>People</SectionTitle>
              {domain.peopleAnchors.map((person) => (
                <View key={person.name} style={styles.personRow}>
                  <Text variant="subhead" style={styles.personName}>
                    {person.name}
                  </Text>
                  {person.previewLine ? (
                    <Text variant="footnote" style={styles.muted} numberOfLines={2}>
                      {person.previewLine}
                    </Text>
                  ) : (
                    <Text variant="footnote" style={styles.muted}>
                      Present in the rhythm of the week
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {upcomingEvents.length > 0 && (
            <View style={styles.block}>
              <SectionTitle>Upcoming</SectionTitle>
              {upcomingEvents.map((c) => (
                <Text key={c.id} variant="body" color="inkSecondary" style={styles.line}>
                  {previewLineForCommitment(c)}
                </Text>
              ))}
            </View>
          )}

          {domain.prepClusters.length > 0 && (
            <View style={styles.block}>
              <SectionTitle>Preparation</SectionTitle>
              {domain.prepClusters.map((cluster, i) => (
                <Text key={i} variant="body" color="inkSecondary" style={styles.line}>
                  {cluster.captureCount} item{cluster.captureCount === 1 ? '' : 's'} connected
                  {cluster.linkedEventTitle ? ` · ${cluster.linkedEventTitle}` : ''}
                </Text>
              ))}
            </View>
          )}

          {captures.length > 0 && (
            <View style={styles.block}>
              <SectionTitle>Linked captures</SectionTitle>
              {captures.slice(0, 6).map((c) => (
                <Text key={c.id} variant="body" color="inkSecondary" style={styles.line}>
                  {c.title}
                </Text>
              ))}
            </View>
          )}

          {domain.recurringPatterns.length > 0 && (
            <View style={styles.block}>
              <SectionTitle>Rhythm</SectionTitle>
              {domain.recurringPatterns.map((p) => (
                <Text key={p.id} variant="footnote" style={styles.muted}>
                  {p.label} · {p.cadenceHint}
                </Text>
              ))}
            </View>
          )}

          {!domain.hasActivity && (
            <Text variant="body" color="inkGhost" style={styles.empty}>
              Quiet right now — Meridian will reflect what returns.
            </Text>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: c.overlay,
  },
  sheet: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '88%' as const,
    backgroundColor: c.sheetBg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.sheetBorder,
    borderBottomWidth: 0,
  },
  handle: {
    alignSelf: 'center' as const,
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: c.sheetHandle,
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  scrollContent: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[10],
    gap: spacing[5],
  },
  headerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing[3],
  },
  iconWrap: {
    padding: spacing[2],
    borderRadius: radius.md,
    backgroundColor: c.lifeCategoryBg,
  },
  block: {
    gap: spacing[2],
  },
  personRow: {
    gap: spacing[1],
    paddingVertical: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.borderSubtle,
  },
  personName: {
    color: c.lifeDomainPerson,
  },
  line: {
    paddingVertical: spacing[1],
  },
  muted: {
    color: c.inkGhost,
    paddingVertical: spacing[1],
  },
  empty: {
    marginTop: spacing[2],
  },
}));

const useSectionStyles = makeStyles(() => ({
  title: {
    letterSpacing: 0.35,
    marginBottom: spacing[1],
  },
}));
