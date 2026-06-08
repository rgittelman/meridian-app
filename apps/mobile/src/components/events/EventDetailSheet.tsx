import { MapPin, Pencil, Video } from 'lucide-react-native';
import { useState } from 'react';
import {
  Linking,
  Modal,
  Platform,
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
import { useTheme } from '@/hooks/useTheme';
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
 */
function cleanDescription(raw: string): string {
  return raw
    .replace(/<(https?:\/\/[^>]+)>/g, '$1')
    .trim();
}

/** True if the location looks like a physical address (not a URL or known virtual tag). */
function isPhysicalLocation(location: string): boolean {
  const lower = location.toLowerCase();
  return !(
    lower.startsWith('http') ||
    lower.includes('zoom.us') ||
    lower.includes('meet.google') ||
    lower.includes('teams.microsoft') ||
    lower.includes('webex') ||
    lower.includes('gotomeeting')
  );
}

/** Returns a platform-safe Maps URL for a given address string. */
function mapsUrlFor(address: string): string {
  const encoded = encodeURIComponent(address);
  if (Platform.OS === 'ios') return `maps://maps.apple.com/?q=${encoded}`;
  if (Platform.OS === 'android') return `geo:0,0?q=${encoded}`;
  return `https://maps.google.com/?q=${encoded}`;
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
  const { colors } = useTheme();
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

  // Edit permission — owner or writer can edit; reader / freeBusyReader / unknown cannot
  const role = event.sourceCalendarAccessRole;
  const canEdit = role === 'owner' || role === 'writer';

  const meetingUrl = event.meetingUrl;
  const meetingProvider: 'teams' | 'meet' | 'other' | null = meetingUrl
    ? meetingUrl.includes('teams.microsoft.com')
      ? 'teams'
      : meetingUrl.includes('meet.google.com')
        ? 'meet'
        : 'other'
    : null;
  const joinLabel =
    meetingProvider === 'teams'
      ? 'Join Teams'
      : meetingProvider === 'meet'
        ? 'Join Google Meet'
        : 'Join Meeting';

  const handleJoinMeeting = () => {
    if (meetingUrl) void Linking.openURL(meetingUrl);
  };

  // Physical location — only show Maps affordance if no virtual meeting URL
  const physicalLocation =
    !meetingUrl && event.location && isPhysicalLocation(event.location)
      ? event.location
      : null;

  const handleOpenMaps = () => {
    if (physicalLocation) void Linking.openURL(mapsUrlFor(physicalLocation));
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        {/* Header row: title area + pencil/view-only badge */}
        <View style={styles.headerRow}>
          <View style={styles.headerSpacer} />
          {canEdit && onEdit ? (
            <Pressable
              onPress={() => onEdit(event)}
              style={({ pressed }) => [styles.pencilBtn, pressed && styles.pencilPressed]}
              accessibilityRole="button"
              accessibilityLabel="Edit event"
              hitSlop={10}
            >
              <Pencil size={18} color={colors.inkSecondary} strokeWidth={1.75} />
            </Pressable>
          ) : (
            <View style={styles.viewOnlyBadge}>
              <Text variant="caption" color="inkGhost" style={styles.viewOnlyText}>
                View only
              </Text>
            </View>
          )}
        </View>

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

          {/* Physical location card — tappable to open Maps */}
          {physicalLocation ? (
            <Pressable
              onPress={handleOpenMaps}
              style={({ pressed }) => [styles.locationCard, pressed && styles.locationPressed]}
              accessibilityRole="link"
              accessibilityLabel={`Open ${physicalLocation} in Maps`}
            >
              <MapPin size={14} color={colors.inkSecondary} strokeWidth={1.75} />
              <View style={styles.locationText}>
                <Text variant="footnote" color="inkSecondary" maxFontSizeMultiplier={1.1}>
                  {physicalLocation}
                </Text>
                <Text variant="caption" color="inkGhost">
                  Open in Maps
                </Text>
              </View>
            </Pressable>
          ) : event.location ? (
            <DetailRow label="Location" value={event.location} />
          ) : null}

          {/* Primary meeting CTA */}
          {meetingProvider ? (
            <Pressable
              onPress={handleJoinMeeting}
              style={({ pressed }) => [styles.joinBtn, pressed && styles.joinPressed]}
              accessibilityRole="link"
              accessibilityLabel={joinLabel}
            >
              <Video size={16} color={colors.sheetBg} strokeWidth={2} />
              <Text variant="subhead" style={styles.joinText}>
                {joinLabel}
              </Text>
            </Pressable>
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
    marginBottom: spacing[1],
  },
  headerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[2],
  },
  headerSpacer: { flex: 1 },
  pencilBtn: {
    padding: spacing[2],
    borderRadius: radius.sm,
  },
  pencilPressed: {
    backgroundColor: c.surfaceMuted,
  },
  viewOnlyBadge: {
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderSubtle,
  },
  viewOnlyText: {
    letterSpacing: 0.2,
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
  // Location card
  locationCard: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderSubtle,
    backgroundColor: c.surfaceMuted,
  },
  locationPressed: {
    opacity: 0.7,
  },
  locationText: {
    flex: 1,
    gap: 2,
  },
  // Join meeting button — filled, prominent
  joinBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing[2],
    alignSelf: 'flex-start' as const,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: radius.md,
    backgroundColor: c.ink,
  },
  joinPressed: {
    opacity: 0.8,
  },
  joinText: {
    color: c.sheetBg,
    fontWeight: '600' as const,
  },
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
}));

const useDetailStyles = makeStyles(() => ({
  row: { gap: spacing[1] },
  label: { letterSpacing: 0.3 },
}));
