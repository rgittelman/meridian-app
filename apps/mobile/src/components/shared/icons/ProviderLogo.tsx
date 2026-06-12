/**
 * ProviderLogo — centralised external service logo dispatcher.
 *
 * Principle (locked): "Brand logos identify external services.
 * Meridian icons identify Meridian concepts."
 *
 * Usage:
 *   <ProviderLogo provider="google_meet"    context="meeting"  size={13} />
 *   <ProviderLogo provider="teams"          context="meeting"  size={24} />
 *   <ProviderLogo provider="google_calendar" context="calendar" size={16} />
 *
 * Fallback behaviour (context-aware, per policy):
 *   context="meeting"  → Lucide Video icon
 *   context="calendar" → Lucide Calendar icon
 *   context="location" → Lucide MapPin icon
 *
 * No platform forks. Identical output on Android and iOS.
 * Never use official brand logos for Meridian concepts.
 */

import { Calendar, MapPin, Video } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { TeamsLogo } from './TeamsLogo';
import { GoogleMeetLogo } from './GoogleMeetLogo';
import { GoogleCalendarLogo } from './GoogleCalendarLogo';

export type ProviderLogoContext = 'meeting' | 'calendar' | 'location';

type ProviderLogoProps = {
  /** Provider key — e.g. 'google_meet', 'teams', 'google_calendar'. */
  provider: string | null | undefined;
  /**
   * Context determines the fallback Meridian icon when the provider
   * is unknown or not yet implemented.
   */
  context: ProviderLogoContext;
  size?: number;
};

export function ProviderLogo({ provider, context, size = 20 }: ProviderLogoProps) {
  const { colors } = useTheme();

  // ── Known provider logos ──────────────────────────────────────────────────
  switch (provider) {
    case 'teams':
      return <TeamsLogo size={size} />;
    case 'google_meet':
      return <GoogleMeetLogo size={size} />;
    case 'google_calendar':
      return <GoogleCalendarLogo size={size} />;
  }

  // ── Context-aware Meridian fallback ───────────────────────────────────────
  // Unknown providers do not get an approximated or placeholder brand logo —
  // they fall back to the appropriate Meridian icon for the surface type.
  switch (context) {
    case 'meeting':
      return <Video size={size} color={colors.inkGhost} strokeWidth={1.75} />;
    case 'calendar':
      return <Calendar size={size} color={colors.inkGhost} strokeWidth={1.75} />;
    case 'location':
      return <MapPin size={size} color={colors.inkGhost} strokeWidth={1.75} />;
  }
}
