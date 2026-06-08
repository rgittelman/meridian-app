import { useState } from 'react';
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { Text } from '@/components/typography/Text';
import type { MeridianCalendarEvent } from '@/types/calendar';
import type { LifeObject } from '@/types/capture';
import { useLinkedCapturesForEvent } from '@/hooks/useLinkedCapturesForEvent';
import { formatEventDateRange } from '@/utils/calendarFormat';
import { resolveOwnerDisplayLabel } from '@/services/attribution/ownerDisplay';
import { makeStyles, radius, spacing } from '@/theme';

type EventDetailSheetProps = {
  visible: boolean;
  event: MeridianCalendarEvent | null;
  onClose: () => void;
  onEdit?: (event: MeridianCalendarEvent) => void;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  const styles = useDetailStyles();
  return (
    <View style={styles.row}>
      <Text variant="caption" color="inkGhost" style={styles.label}>
        {label}
      </Text>
      <Text variant="body" color="ink" maxFontSizeMultiplier={1.2}>
        {value}
      </Text>
    </View>
  );
}

/** Maps Google Calendar API responseStatus values to human-readable labels. */
const RSVP_LABEL: Record<string, string> = {
  accepted: 'Going',
  declined: 'Declined',
  tentative: 'Maybe',
  needsAction: 'Awaiting',
};

/**
 * Strips angle-bracket annotations Google Calendar adds to attendee display names.
 * e.g. "Jane Smith<external contact>" → "Jane Smith"
 */
function cleanAttendeeName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/<[^>]*>/g, '').trim();
  return cleaned || null;
}

/**
 * Strips angle-bracket URL markup from calendar event descriptions.
 * MS Teams and other providers format URLs as <https://...> in the description.
 * e.g. "Join now<https://teams.microsoft.com/...>" → "Join now https://teams.microsoft.com/..."
 */
function cleanDescription(raw: string): string {
  return raw
    .replace(/<(https?:\/\/[^>]+)>/g, '$1') // <https://...> → plain URL
    .trim();
}

function LinkedCaptureRow({ item }: { item: LifeObject }) {
  return (
    <Text variant="footnote" color="inkSecondary" maxFontSizeMultiplier={1.1}>
      • {item.title}
    </Text>
  );
}

export function EventDetailSheet({
  visible,
  event,
  onClose,
  onEdit,
}: EventDetailSheetProps) {
  const styles = useStyles();
  const [descExpanded, setDescExpanded] = useState(false);
  const linked = useLinkedCapturesForEvent(event?.id ?? null);

  if (!event) return null;

  const attr = event.attribution;
  const ownerLabel = resolveOwnerDisplayLabel(attr);

  const description = cleanDescription(event.description?.trim() ?? '');
  const descPreview =
    description.length > 220 && !descExpanded
      ? description.slice(0, 220).trim() + '…'
      : description;

  const handleJoinMeet = () => {
    const url = event.meetingUrl;
    if (url) void Linking.openURL(url);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text variant="display" color="ink" style={styles.title} maxFontSizeMultiplier={1.15}>
            {event.displayTitle ?? event.title}
          </Text>
          {event.rawTitle &&
          event.displayTitle &&
          event.rawTitle !== event.displayTitle ? (
            <DetailRow label="Calendar title" value={event.rawTitle} />
          ) : null}
          <Text variant="body" color="inkSecondary" maxFontSizeMultiplier={1.1}>
            {formatEventDateRange(event)}
          </Text>

          <View style={styles.meta}>
            <Text variant="footnote" color="inkGhost">
              {event.planAttributionLine ?? event.displaySourceLabel}
            </Text>
            {ownerLabel ? (
              <Text variant="footnote" color="inkGhost">
                · Owner {ownerLabel}
              </Text>
            ) : attr?.ownerConfidence === 'low' || attr?.ownerType === 'unknown' ? (
              <Text variant="footnote" color="inkGhost">
                · Owner unknown
              </Text>
            ) : null}
          </View>

          {event.location ? (
            <DetailRow label="Location" value={event.location} />
          ) : null}

          {description ? (
            <View style={styles.block}>
              <Text variant="caption" color="inkGhost" style={styles.label}>
                Notes
              </Text>
              <Text variant="body" color="inkSecondary" maxFontSizeMultiplier={1.15}>
                {descPreview}
              </Text>
              {description.length > 220 && (
                <Pressable onPress={() => setDescExpanded((v) => !v)} hitSlop={8}>
                  <Text variant="footnote" style={styles.linkText}>
                    {descExpanded ? 'Show less' : 'Show more'}
                  </Text>
                </Pressable>
              )}
            </View>
          ) : (
            <Text variant="footnote" color="inkGhost" style={styles.empty}>
              No extra details attached.
            </Text>
          )}

          {event.meetingUrl ? (
            <Pressable
              onPress={handleJoinMeet}
              style={({ pressed }) => [styles.meetBtn, pressed && styles.meetPressed]}
              accessibilityRole="link"
              accessibilityLabel="Join Google Meet"
            >
              <Text variant="subhead" style={styles.meetText}>
                Join Meet
              </Text>
            </Pressable>
          ) : null}

          {event.attendees.length > 0 && (
            <View style={styles.block}>
              <Text variant="caption" color="inkGhost" style={styles.label}>
                Attendees
              </Text>
              {event.attendees.slice(0, 8).map((a, i) => {
                const name = cleanAttendeeName(a.displayName) ?? a.email ?? 'Guest';
                const rsvp = a.responseStatus ? RSVP_LABEL[a.responseStatus] : null;
                return (
                  <Text
                    key={`${a.email ?? a.displayName ?? i}`}
                    variant="footnote"
                    color="inkSecondary"
                  >
                    {name}
                    {rsvp ? ` · ${rsvp}` : ''}
                  </Text>
                );
              })}
            </View>
          )}

          {event.organizer?.displayName || event.organizer?.email ? (
            <DetailRow
              label="Organizer"
              value={event.organizer.displayName ?? event.organizer.email ?? ''}
            />
          ) : null}

          {linked.length > 0 && (
            <View style={styles.block}>
              <Text variant="caption" color="inkGhost" style={styles.label}>
                Connected items
              </Text>
              {linked.map((item) => (
                <LinkedCaptureRow key={item.id} item={item} />
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {onEdit && (
            <Pressable
              onPress={() => onEdit(event)}
              style={({ pressed }) => [styles.footerBtn, pressed && styles.footerPressed]}
            >
              <Text variant="subhead" style={styles.footerBtnText}>
                Edit
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.footerBtn, pressed && styles.footerPressed]}
          >
            <Text variant="subhead" color="inkSecondary">
              Close
            </Text>
          </Pressable>
        </View>
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
    maxHeight: '88%',
    backgroundColor: c.sheetBg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: c.sheetBorder,
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
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[4],
    gap: spacing[4],
  },
  title: { maxWidth: 340 },
  meta: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: spacing[1],
  },
  block: { gap: spacing[2] },
  label: { letterSpacing: 0.3 },
  empty: { fontStyle: 'italic' as const },
  linkText: { color: c.inkTertiary, marginTop: spacing[1] },
  meetBtn: {
    alignSelf: 'flex-start' as const,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderSubtle,
  },
  meetPressed: { backgroundColor: c.surfaceMuted },
  meetText: { color: c.ink },
  footer: {
    flexDirection: 'row' as const,
    justifyContent: 'flex-end' as const,
    gap: spacing[3],
    padding: spacing[4],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.sheetBorder,
  },
  footerBtn: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
  },
  footerPressed: { opacity: 0.7 },
  footerBtnText: { color: c.ink },
}));

const useDetailStyles = makeStyles(() => ({
  row: { gap: spacing[1] },
  label: { letterSpacing: 0.3 },
}));
