import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { Text } from '@/components/typography/Text';
import { NotificationDecisionTrace } from '@/components/notifications/NotificationDecisionTrace';
import { NotificationFeedSection } from '@/components/notifications/NotificationFeedSection';
import { NotificationSilenceReasonsSection } from '@/components/notifications/NotificationSilenceReasonsSection';
import { useNotificationVerification } from '@/hooks/useNotificationVerification';
import { useTheme } from '@/hooks/useTheme';
import { notificationTypeLabel } from '@/services/notifications/verificationLabels';
import type { NotificationCandidateType } from '@/types/notification';
import { makeStyles, spacing } from '@/theme';

const PREVIEW_TYPES: NotificationCandidateType[] = [
  'morning_brief',
  'transition_awareness',
  'evening_wind_down',
  'critical_commitment_protection',
];

type NotificationVerificationModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function NotificationVerificationModal({
  visible,
  onClose,
}: NotificationVerificationModalProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const verification = useNotificationVerification();
  const {
    intelligence,
    traces,
    feed,
    bundlingReview,
    previewsByType,
    silenceReasons,
    systemStatus,
  } = verification;

  const summary = {
    generated: feed.generated.length,
    suppressed: feed.suppressed.length,
    bundled: feed.bundled.length,
    approved: feed.approved.length,
    wouldSend: intelligence.approvedBundles.length,
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top + spacing[2] }]}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text variant="caption" color="inkGhost" style={styles.devBadge}>
              Dev only · No delivery
            </Text>
            <Text variant="display" color="ink" maxFontSizeMultiplier={1.1}>
              Notification Intelligence
            </Text>
            <Text variant="footnote" color="inkSecondary">
              What would send, why, and why not — before any push exists.
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close verification feed"
          >
            <X size={22} color={colors.inkSecondary} strokeWidth={1.75} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + spacing[8] },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <NotificationSilenceReasonsSection
            reasons={silenceReasons}
            systemStatus={systemStatus}
            wouldSendCount={summary.wouldSend}
            generatedCount={summary.generated}
          />

          <View style={styles.summaryCard}>
            <Text variant="footnote" color="inkSecondary">
              Generated {summary.generated} · Suppressed {summary.suppressed} · Bundled{' '}
              {summary.bundled} · Would send {summary.wouldSend}
            </Text>
            {summary.generated === 0 && summary.wouldSend === 0 ? (
              <Text variant="caption" color="inkGhost" style={styles.summaryNote}>
                Counts are zero because no interruption was earned — see silence reasons above.
              </Text>
            ) : null}
          </View>

          <NotificationFeedSection
            title="Approved (would send)"
            rows={feed.approved}
            emptyMessage="Nothing earned delivery in the current window."
          />

          <NotificationFeedSection
            title="Suppressed"
            rows={feed.suppressed}
            emptyMessage="No suppressions — silence is doing its job elsewhere."
          />

          <View style={styles.section}>
            <Text variant="callout" color="ink" style={styles.sectionTitle}>
              Bundling review
            </Text>
            <Text variant="caption" color="inkGhost" style={styles.subLabel}>
              Before bundling ({bundlingReview.before.length})
            </Text>
            {bundlingReview.before.length === 0 ? (
              <Text variant="footnote" color="inkGhost" style={styles.empty}>
                No eligible candidates to bundle.
              </Text>
            ) : (
              bundlingReview.before.map((item) => (
                <Text key={item.id} variant="footnote" color="inkSecondary">
                  · {item.primaryLine}
                </Text>
              ))
            )}
            <Text variant="caption" color="inkGhost" style={[styles.subLabel, styles.afterLabel]}>
              After bundling ({bundlingReview.after.length} interruption
              {bundlingReview.after.length === 1 ? '' : 's'})
            </Text>
            {bundlingReview.after.length === 0 ? (
              <Text variant="footnote" color="inkGhost" style={styles.empty}>
                No bundles formed.
              </Text>
            ) : (
              bundlingReview.after.map((bundle) => (
                <View key={bundle.id} style={styles.bundleCard}>
                  <Text variant="subhead" color="ink">
                    {bundle.title}
                  </Text>
                  {bundle.lines.map((line) => (
                    <Text key={line} variant="footnote" color="inkSecondary">
                      {line}
                    </Text>
                  ))}
                </View>
              ))
            )}
          </View>

          <View style={styles.section}>
            <Text variant="callout" color="ink" style={styles.sectionTitle}>
              Sample output (real data, preview windows)
            </Text>
            <Text variant="footnote" color="inkGhost" style={styles.empty}>
              Render only — not sent. Bypasses hour windows for inspection.
            </Text>
            {PREVIEW_TYPES.map((type) => {
              const rows = previewsByType[type] ?? [];
              return (
                <View key={type} style={styles.previewTypeBlock}>
                  <Text variant="footnote" color="inkSecondary" style={styles.previewTypeTitle}>
                    {notificationTypeLabel(type)}
                  </Text>
                  {rows.length === 0 ? (
                    <Text variant="caption" color="inkGhost" style={styles.empty}>
                      No preview from current calendar/capture data.
                    </Text>
                  ) : (
                    rows.map((row) => (
                      <Text key={row.id} variant="footnote" color="ink">
                        {row.primaryLine}
                      </Text>
                    ))
                  )}
                </View>
              );
            })}
          </View>

          <View style={styles.section}>
            <Text variant="callout" color="ink" style={styles.sectionTitle}>
              Decision traces
            </Text>
            {traces.length === 0 ? (
              <Text variant="footnote" color="inkGhost" style={styles.empty}>
                No candidates generated for the current moment.
              </Text>
            ) : (
              traces.map((trace) => (
                <NotificationDecisionTrace key={trace.candidateId} trace={trace} />
              ))
            )}
          </View>

          <NotificationFeedSection
            title="All generated"
            rows={feed.generated}
            emptyMessage="No candidates in the current delivery window."
          />

          <NotificationFeedSection title="Bundled (merged)" rows={feed.bundled} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    gap: spacing[3],
  },
  headerText: {
    flex: 1,
    gap: spacing[1],
  },
  devBadge: {
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    gap: spacing[5],
  },
  summaryCard: {
    padding: spacing[3],
    backgroundColor: c.surfaceMuted,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.borderSubtle,
    gap: spacing[2],
  },
  summaryNote: {
    fontStyle: 'italic' as const,
  },
  section: {
    gap: spacing[2],
  },
  sectionTitle: {
    fontWeight: '600' as const,
  },
  subLabel: {
    marginTop: spacing[1],
  },
  afterLabel: {
    marginTop: spacing[3],
  },
  empty: {
    fontStyle: 'italic' as const,
    paddingLeft: spacing[1],
  },
  bundleCard: {
    gap: spacing[1],
    padding: spacing[3],
    backgroundColor: c.surfaceMuted,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.borderSubtle,
  },
  previewTypeBlock: {
    gap: spacing[1],
    paddingLeft: spacing[2],
  },
  previewTypeTitle: {
    fontWeight: '600' as const,
    marginTop: spacing[2],
  },
}));
