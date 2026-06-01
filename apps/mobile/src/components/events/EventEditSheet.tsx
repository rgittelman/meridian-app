import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/typography/Text';
import type { MeridianCalendarEvent } from '@/types/calendar';
import { formatEventDateRange } from '@/utils/calendarFormat';
import { makeStyles, radius, spacing } from '@/theme';

type EventEditSheetProps = {
  visible: boolean;
  event: MeridianCalendarEvent | null;
  onClose: () => void;
};

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  const styles = useFieldStyles();
  return (
    <View style={styles.field}>
      <Text variant="caption" color="inkGhost" style={styles.label}>
        {label}
      </Text>
      <View style={styles.valueBox}>
        <Text variant="body" color="inkSecondary" maxFontSizeMultiplier={1.1}>
          {value || '—'}
        </Text>
      </View>
    </View>
  );
}

export function EventEditSheet({ visible, event, onClose }: EventEditSheetProps) {
  const styles = useStyles();

  if (!event) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text variant="title" color="ink" style={styles.heading}>
          Edit event
        </Text>
        <Text variant="footnote" color="inkGhost" style={styles.notice}>
          Event editing will be available once calendar write sync is enabled.
        </Text>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ReadOnlyField label="Title" value={event.title} />
          <ReadOnlyField label="When" value={formatEventDateRange(event)} />
          <ReadOnlyField
            label="All day"
            value={event.allDay ? 'Yes' : 'No'}
          />
          <ReadOnlyField label="Location" value={event.location ?? ''} />
          <ReadOnlyField
            label="Description"
            value={event.description ?? ''}
          />
          <ReadOnlyField label="Calendar" value={event.sourceCalendarName} />
          <ReadOnlyField
            label="Google Meet"
            value={event.meetingUrl ? 'On' : 'Off'}
          />
          <ReadOnlyField
            label="Attendees"
            value={
              event.attendees.length > 0
                ? `${event.attendees.length} listed`
                : 'None'
            }
          />
        </ScrollView>

        <Pressable
          disabled
          style={[styles.saveBtn, styles.saveDisabled]}
          accessibilityState={{ disabled: true }}
        >
          <Text variant="subhead" color="inkGhost">
            Save
          </Text>
        </Pressable>

        <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
          <Text variant="subhead" color="inkSecondary">
            Close
          </Text>
        </Pressable>
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
    maxHeight: '90%',
    backgroundColor: c.sheetBg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: spacing[6],
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
  heading: {
    paddingHorizontal: spacing[5],
    marginBottom: spacing[1],
  },
  notice: {
    paddingHorizontal: spacing[5],
    marginBottom: spacing[3],
    fontStyle: 'italic' as const,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing[5],
    gap: spacing[3],
    paddingBottom: spacing[4],
  },
  saveBtn: {
    marginHorizontal: spacing[5],
    marginTop: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: radius.md,
    alignItems: 'center' as const,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderSubtle,
  },
  saveDisabled: {
    backgroundColor: c.surfaceMuted,
    opacity: 0.6,
  },
  closeBtn: {
    alignSelf: 'center' as const,
    marginTop: spacing[3],
    padding: spacing[2],
  },
}));

const useFieldStyles = makeStyles((c) => ({
  field: { gap: spacing[1] },
  label: { letterSpacing: 0.3 },
  valueBox: {
    backgroundColor: c.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing[3],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderSubtle,
  },
}));
