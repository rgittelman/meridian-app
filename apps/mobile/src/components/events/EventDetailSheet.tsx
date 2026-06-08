import { ChevronRight, ExternalLink, MapPin, Pencil, Video, X } from 'lucide-react-native';
import { TeamsLogo } from '@/components/shared/icons/TeamsLogo';
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

// Brand colors — not theme-adaptive (intentional: these are meeting provider identity colors)
const TEAMS_COLOR = '#6264A7';
const MEET_COLOR = '#1A73E8';

type EventDetailSheetProps = {
  visible: boolean;
  event: MeridianCalendarEvent | null;
  onClose: () => void;
  onEdit?: (event: MeridianCalendarEvent) => void;
};

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

/** Returns a relative day label for the given date: TODAY, TOMORROW, or the weekday name. */
function relativeDayLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'TODAY';
  if (diff === 1) return 'TOMORROW';
  return date.toLocaleDateString(undefined, { weekday: 'long' }).toUpperCase();
}

/** Derives 1–2 initials from a display name or email. */
function getInitials(name: string): string {
  // email fallback — use first two chars before @
  if (name.includes('@')) return name.slice(0, 2).toUpperCase();
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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

  // Meeting URL detection
  const meetingUrl = event.meetingUrl;
  const meetingProvider: 'teams' | 'meet' | 'other' | null = meetingUrl
    ? meetingUrl.includes('teams.microsoft.com')
      ? 'teams'
      : meetingUrl.includes('meet.google.com')
        ? 'meet'
        : 'other'
    : null;

  const meetingCardLabel =
    meetingProvider === 'teams'
      ? 'Microsoft Teams Meeting'
      : meetingProvider === 'meet'
        ? 'Google Meet'
        : 'Virtual Meeting';

  const joinLabel =
    meetingProvider === 'teams'
      ? 'Join Teams'
      : meetingProvider === 'meet'
        ? 'Join Google Meet'
        : 'Join Meeting';

  const joinColor = meetingProvider === 'teams' ? TEAMS_COLOR : MEET_COLOR;

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

  const dayLabel = relativeDayLabel(event.startTime);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        {/* Top bar: X close (left) + pencil or view-only badge (right) */}
        <View style={styles.topBar}>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.topBarBtn, pressed && styles.topBarBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={10}
          >
            <X size={18} color={colors.inkSecondary} strokeWidth={2} />
          </Pressable>

          <View style={styles.topBarFill} />

          {canEdit && onEdit ? (
            <Pressable
              onPress={() => onEdit(event)}
              style={({ pressed }) => [styles.topBarBtn, pressed && styles.topBarBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Edit event"
              hitSlop={10}
            >
              <Pencil size={18} color={colors.inkSecondary} strokeWidth={1.75} />
            </Pressable>
          ) : (
            <View style={styles.viewOnlyBadge}>
              <Text variant="caption" style={styles.viewOnlyText}>
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
          {/* Day chip */}
          <Text variant="caption" style={styles.dayChip} maxFontSizeMultiplier={1.0}>
            {dayLabel}
          </Text>

          <Text variant="display" color="ink" style={styles.title} maxFontSizeMultiplier={1.15}>
            {event.displayTitle ?? event.title}
          </Text>

          {/* Date + time row */}
          <Text variant="body" color="inkSecondary" maxFontSizeMultiplier={1.1}>
            {formatEventDateRange(event)}
          </Text>

          {event.rawTitle &&
          event.displayTitle &&
          event.rawTitle !== event.displayTitle ? (
            <View style={styles.detailRow}>
              <Text variant="caption" color="inkGhost" style={styles.sectionLabel}>
                Calendar title
              </Text>
              <Text variant="body" color="ink" maxFontSizeMultiplier={1.2}>
                {event.rawTitle}
              </Text>
            </View>
          ) : null}

          {/* Attribution */}
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

          {/* Location / Meeting section */}
          {(meetingProvider || physicalLocation || event.location) ? (
            <View style={styles.block}>
              <Text variant="caption" color="inkGhost" style={styles.sectionLabel}>
                {meetingProvider ? 'Location / Meeting' : 'Location'}
              </Text>

              {/* Meeting type card — tappable */}
              {meetingProvider ? (
                <Pressable
                  onPress={handleJoinMeeting}
                  style={({ pressed }) => [styles.meetingCard, pressed && styles.meetingCardPressed]}
                  accessibilityRole="link"
                  accessibilityLabel={meetingCardLabel}
                >
                  <View style={[styles.meetingIconBox, { backgroundColor: joinColor + '18' }]}>
                    {meetingProvider === 'teams' ? (
                      <TeamsLogo size={22} />
                    ) : (
                      <Video size={16} color={joinColor} strokeWidth={2} />
                    )}
                  </View>
                  <Text variant="subhead" color="ink" style={styles.meetingCardLabel} numberOfLines={1}>
                    {meetingCardLabel}
                  </Text>
                  <ChevronRight size={16} color={colors.inkGhost} strokeWidth={1.75} />
                </Pressable>
              ) : null}

              {/* Physical location card — tappable to open Maps */}
              {physicalLocation ? (
                <Pressable
                  onPress={handleOpenMaps}
                  style={({ pressed }) => [styles.locationCard, pressed && styles.locationCardPressed]}
                  accessibilityRole="link"
                  accessibilityLabel={`Open ${physicalLocation} in Maps`}
                >
                  <View style={styles.locationCardContent}>
                    <MapPin size={14} color={colors.inkSecondary} strokeWidth={1.75} />
                    <View style={styles.locationTextBlock}>
                      <Text variant="body" style={styles.locationAddress} maxFontSizeMultiplier={1.1}>
                        {physicalLocation}
                      </Text>
                      <View style={styles.openMapsRow}>
                        <Text variant="caption" color="inkGhost">
                          Open in Maps
                        </Text>
                        <ExternalLink size={11} color={colors.inkGhost} strokeWidth={1.75} />
                      </View>
                    </View>
                  </View>
                </Pressable>
              ) : event.location && !meetingProvider ? (
                <Text variant="body" color="ink" maxFontSizeMultiplier={1.2}>
                  {event.location}
                </Text>
              ) : null}
            </View>
          ) : null}

          {/* Notes */}
          {description ? (
            <View style={styles.block}>
              <Text variant="caption" color="inkGhost" style={styles.sectionLabel}>
                Notes
              </Text>
              <Text variant="body" color="inkSecondary" maxFontSizeMultiplier={1.15}>
                {descPreview}
              </Text>
              {description.length > 220 && (
                <Pressable onPress={() => setDescExpanded((v) => !v)} hitSlop={8}>
                  <Text variant="footnote" style={styles.showMoreText}>
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

          {/* Primary Join CTA — below notes, full-width prominent */}
          {meetingProvider ? (
            <Pressable
              onPress={handleJoinMeeting}
              style={({ pressed }) => [
                styles.joinBtn,
                { backgroundColor: joinColor },
                pressed && styles.joinBtnPressed,
              ]}
              accessibilityRole="link"
              accessibilityLabel={joinLabel}
            >
              {meetingProvider === 'teams' ? (
                <TeamsLogo size={22} onBackground />
              ) : (
                <Video size={18} color="#fff" strokeWidth={2} />
              )}
              <Text variant="subhead" style={styles.joinBtnText}>
                {joinLabel}
              </Text>
              <ChevronRight size={18} color="#fff" strokeWidth={2} style={styles.joinChevron} />
            </Pressable>
          ) : null}

          {/* Attendees */}
          {event.attendees.length > 0 && (
            <View style={styles.block}>
              <Text variant="caption" color="inkGhost" style={styles.sectionLabel}>
                Attendees
              </Text>
              {event.attendees.slice(0, 8).map((a, i) => {
                const name = cleanAttendeeName(a.displayName) ?? a.email ?? 'Guest';
                const initials = getInitials(name);
                const rsvp = a.responseStatus ? RSVP_LABEL[a.responseStatus] : null;
                return (
                  <View key={`${a.email ?? a.displayName ?? i}`} style={styles.attendeeRow}>
                    <View style={styles.attendeeAvatar}>
                      <Text variant="caption" style={styles.attendeeInitials} maxFontSizeMultiplier={1.0}>
                        {initials}
                      </Text>
                    </View>
                    <Text variant="footnote" color="inkSecondary" style={styles.attendeeName}>
                      {name}
                    </Text>
                    {rsvp ? (
                      <View style={[styles.rsvpChip, rsvpChipStyle(a.responseStatus)]}>
                        <Text variant="caption" style={[styles.rsvpText, rsvpTextStyle(a.responseStatus)]}>
                          {rsvp}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}

          {/* Organizer */}
          {event.organizer?.displayName || event.organizer?.email ? (
            <View style={styles.detailRow}>
              <Text variant="caption" color="inkGhost" style={styles.sectionLabel}>
                Organizer
              </Text>
              <Text variant="body" color="ink" maxFontSizeMultiplier={1.2}>
                {event.organizer.displayName ?? event.organizer.email ?? ''}
              </Text>
            </View>
          ) : null}

          {/* Connected captures */}
          {linked.length > 0 && (
            <View style={styles.block}>
              <Text variant="caption" color="inkGhost" style={styles.sectionLabel}>
                Connected items
              </Text>
              {linked.map((item) => (
                <LinkedCaptureRow key={item.id} item={item} />
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// RSVP chip color helpers
function rsvpChipStyle(status: string | undefined): object {
  switch (status) {
    case 'accepted': return { backgroundColor: 'rgba(90,142,120,0.15)' };
    case 'declined': return { backgroundColor: 'rgba(180,70,70,0.12)' };
    case 'tentative': return { backgroundColor: 'rgba(180,140,60,0.12)' };
    default: return { backgroundColor: 'rgba(120,120,120,0.10)' };
  }
}

function rsvpTextStyle(status: string | undefined): object {
  switch (status) {
    case 'accepted': return { color: '#5A8E78' };
    case 'declined': return { color: '#B44646' };
    case 'tentative': return { color: '#B08C3C' };
    default: return { color: '#888' };
  }
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
  // Top bar: X left, fill, pencil/badge right
  topBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
  },
  topBarFill: { flex: 1 },
  topBarBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: c.surfaceMuted,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  topBarBtnPressed: { opacity: 0.6 },
  viewOnlyBadge: {
    paddingVertical: spacing[1] + 2,
    paddingHorizontal: spacing[3],
    borderRadius: radius.full,
    backgroundColor: c.surfaceMuted,
  },
  viewOnlyText: {
    letterSpacing: 0.2,
    color: c.inkSecondary,
    fontWeight: '500' as const,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[8],
    gap: spacing[4],
  },
  // Day chip
  dayChip: {
    letterSpacing: 0.5,
    fontWeight: '600' as const,
    fontSize: 11,
    color: c.inkTertiary,
  },
  title: { maxWidth: 340 },
  meta: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: spacing[1],
  },
  block: { gap: spacing[2] },
  sectionLabel: { letterSpacing: 0.3 },
  detailRow: { gap: spacing[1] },
  empty: { fontStyle: 'italic' as const },
  showMoreText: { color: c.inkTertiary, marginTop: spacing[1] },
  // Meeting type card
  meetingCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.sheetBg,
  },
  meetingCardPressed: { backgroundColor: c.surfaceMuted },
  meetingIconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  meetingCardLabel: { flex: 1 },
  // Location card
  locationCard: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden' as const,
  },
  locationCardPressed: { opacity: 0.7 },
  locationCardContent: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: spacing[3],
    padding: spacing[3],
  },
  locationTextBlock: { flex: 1, gap: 2 },
  locationAddress: { color: c.inkSecondary },
  // Join CTA button
  joinBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing[2],
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderRadius: radius.md,
  },
  joinBtnPressed: { opacity: 0.85 },
  joinBtnText: {
    color: '#fff',
    fontWeight: '600' as const,
    flex: 1,
  },
  joinChevron: {},
  // Location card open-maps affordance
  openMapsRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  // Attendees
  attendeeRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing[2],
    minHeight: 32,
  },
  attendeeAvatar: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: c.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0,
  },
  attendeeInitials: {
    color: c.inkSecondary,
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
    lineHeight: 14,
  },
  attendeeName: { flex: 1 },
  rsvpChip: {
    paddingVertical: 2,
    paddingHorizontal: spacing[2],
    borderRadius: radius.full,
  },
  rsvpText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
}));
