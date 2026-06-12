/**
 * Meeting provider detection and metadata.
 *
 * Single source of truth for:
 *   - Resolving a meetingUrl to a typed MeetingProvider
 *   - Display names (tag rows, cards)
 *   - Join action labels (CTA rows)
 *   - Brand accent colors (card backgrounds)
 *
 * All UI components must consume these functions rather than
 * duplicating URL-sniffing or label logic inline.
 */

export type MeetingProvider = 'teams' | 'google_meet' | 'zoom' | 'other';

// Brand accent colors — intentionally not theme-adaptive.
// These are provider identity colors, not Meridian design tokens.
const COLORS: Record<MeetingProvider, string> = {
  teams:       '#6264A7',
  google_meet: '#1A73E8',
  zoom:        '#2D8CFF',
  other:       '#6B7280',
};

/**
 * Resolve a meeting URL to a typed provider.
 * Returns null if no URL is present.
 */
export function resolveMeetingProvider(
  url: string | null | undefined,
): MeetingProvider | null {
  if (!url) return null;
  if (url.includes('teams.microsoft.com')) return 'teams';
  if (url.includes('meet.google.com'))     return 'google_meet';
  if (url.includes('zoom.us'))             return 'zoom';
  return 'other';
}

/**
 * Short display name — for tag rows and card labels.
 * e.g. "Google Meet", "Microsoft Teams"
 */
export function meetingProviderDisplayName(provider: MeetingProvider): string {
  switch (provider) {
    case 'teams':       return 'Microsoft Teams';
    case 'google_meet': return 'Google Meet';
    case 'zoom':        return 'Zoom';
    case 'other':       return 'Virtual Meeting';
  }
}

/**
 * Action label — for CTA join cards.
 * e.g. "Join Google Meet", "Join Teams"
 */
export function meetingProviderJoinLabel(provider: MeetingProvider): string {
  switch (provider) {
    case 'teams':       return 'Join Teams';
    case 'google_meet': return 'Join Google Meet';
    case 'zoom':        return 'Join Zoom';
    case 'other':       return 'Join Meeting';
  }
}

/**
 * Brand accent color for the provider.
 * Used for tinted card backgrounds (color + opacity hex suffix).
 */
export function meetingProviderColor(provider: MeetingProvider): string {
  return COLORS[provider];
}
