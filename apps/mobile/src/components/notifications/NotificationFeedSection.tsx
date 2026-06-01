import { View } from 'react-native';

import { Text } from '@/components/typography/Text';
import type { NotificationFeedRow } from '@/types/notification';
import { makeStyles, spacing } from '@/theme';

type NotificationFeedSectionProps = {
  title: string;
  rows: NotificationFeedRow[];
  emptyMessage?: string;
};

function FeedRow({ row }: { row: NotificationFeedRow }) {
  const styles = useRowStyles();

  return (
    <View style={[styles.row, row.isPreview && styles.previewRow]}>
      <View style={styles.header}>
        <Text variant="callout" color="ink" maxFontSizeMultiplier={1.08}>
          {row.primaryLine}
        </Text>
        {row.isPreview ? (
          <Text variant="caption" style={styles.previewBadge}>
            Preview
          </Text>
        ) : null}
      </View>
      <Text variant="caption" color="inkGhost">
        {row.typeLabel}
      </Text>
      <View style={styles.meta}>
        <MetaCell label="Decision" value={row.decision === 'send' ? 'Approved' : 'Suppressed'} />
        <MetaCell label="Reason" value={row.reason ?? '—'} />
      </View>
      <View style={styles.meta}>
        <MetaCell label="Timing" value={row.timing} />
        <MetaCell label="Event" value={row.relatedEvent ?? '—'} />
      </View>
      <Text variant="caption" color="inkTertiary">
        People: {row.relatedPeople}
      </Text>
    </View>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  const styles = useRowStyles();
  return (
    <View style={styles.metaCell}>
      <Text variant="caption" color="inkGhost">
        {label}
      </Text>
      <Text variant="footnote" color="inkSecondary" numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

export function NotificationFeedSection({
  title,
  rows,
  emptyMessage = 'None in this window.',
}: NotificationFeedSectionProps) {
  const styles = useStyles();

  return (
    <View style={styles.section}>
      <Text variant="callout" color="ink" style={styles.title}>
        {title}
      </Text>
      {rows.length === 0 ? (
        <Text variant="footnote" color="inkGhost" style={styles.empty}>
          {emptyMessage}
        </Text>
      ) : (
        rows.map((row) => <FeedRow key={`${row.id}-${row.isPreview}`} row={row} />)
      )}
    </View>
  );
}

const useStyles = makeStyles(() => ({
  section: {
    gap: spacing[2],
  },
  title: {
    fontWeight: '600' as const,
  },
  empty: {
    fontStyle: 'italic' as const,
    paddingLeft: spacing[2],
  },
}));

const useRowStyles = makeStyles((c) => ({
  row: {
    gap: spacing[1],
    padding: spacing[3],
    backgroundColor: c.surfaceMuted,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.borderSubtle,
  },
  previewRow: {
    borderStyle: 'dashed' as const,
    opacity: 0.92,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    justifyContent: 'space-between' as const,
    gap: spacing[2],
  },
  previewBadge: {
    color: c.inkGhost,
    fontStyle: 'italic' as const,
  },
  meta: {
    flexDirection: 'row' as const,
    gap: spacing[3],
    marginTop: spacing[1],
  },
  metaCell: {
    flex: 1,
    gap: 2,
  },
}));
