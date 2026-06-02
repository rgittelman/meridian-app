import type {
  NotificationAuditEntry,
  NotificationBundle,
  ProcessedNotificationCandidate,
} from '@/types/notification';
import type { MeridianCalendarEvent } from '@/types/calendar';
import type { VenueCoordinates } from '@/services/location/venueIntelligence';
import { classifyVenueLocation } from '@/services/location/venueIntelligence';
import { useVenueCacheStore } from '@/store/venueCacheStore';
import { isDevEnvironment } from '@/utils/isDev';

export function logNotificationAudit(
  auditLog: NotificationAuditEntry[],
  approved: NotificationBundle[],
  candidates: ProcessedNotificationCandidate[],
): void {
  if (!isDevEnvironment()) return;

  const generated = auditLog.filter((e) => e.action === 'generated').length;
  const suppressed = auditLog.filter((e) => e.action === 'suppressed').length;
  const bundled = auditLog.filter((e) => e.action === 'bundled').length;
  const approvedCount = auditLog.filter((e) => e.action === 'approved').length;

  console.log('[Notification Intelligence] ─── audit ───');
  console.log('[Notification Intelligence] generated:', generated);
  console.log('[Notification Intelligence] suppressed:', suppressed);
  console.log('[Notification Intelligence] bundled:', bundled);
  console.log('[Notification Intelligence] approved:', approvedCount);
  console.log('[Notification Intelligence] send-ready bundles:', approved.length);

  for (const entry of auditLog.slice(0, 24)) {
    console.log('[Notification Intelligence] entry', {
      action: entry.action,
      type: entry.candidateType,
      interruptionReason: entry.interruptionReason,
      suppressionReason: entry.suppressionReason,
      bundleKey: entry.bundleKey,
      bundleId: entry.bundleId,
      decision: entry.decision,
    });
  }

  for (const c of candidates.filter((x) => x.decision === 'suppress').slice(0, 8)) {
    console.log('[Notification Intelligence] suppressed candidate', {
      id: c.id,
      type: c.type,
      reason: c.suppressionReason,
      score: c.interruptionScore.total,
    });
  }
}

/**
 * Phase H0 — Venue Intelligence diagnostic.
 * Logs venue geocode status for each calendar event that has a location string.
 * Dev-only. Call from the dev diagnostic panel after sync.
 */
export function logVenueDiagnostics(
  events: MeridianCalendarEvent[],
  venueCoordinates: Record<string, VenueCoordinates>,
): void {
  if (!isDevEnvironment()) return;

  const cacheEntries = useVenueCacheStore.getState().entries;
  const eventsWithLocation = events.filter((e) => e.location);

  console.log('[Venue Intelligence] ─── diagnostics ───');
  console.log('[Venue Intelligence] events with location:', eventsWithLocation.length);
  console.log('[Venue Intelligence] events with resolved coords:', Object.keys(venueCoordinates).length);

  for (const event of eventsWithLocation.slice(0, 20)) {
    const raw = event.location!;
    const classification = classifyVenueLocation(raw);
    const coords = venueCoordinates[event.id];

    if (!classification.shouldGeocode) {
      console.log('[Venue Intelligence] skip', {
        event: event.displayTitle,
        location: raw,
        reason: classification.reason,
      });
      continue;
    }

    const cached = cacheEntries[classification.normalizedKey];
    const status = coords
      ? 'resolved'
      : cached?.geocodeSucceeded === false
        ? 'geocode_failed'
        : 'pending';

    console.log('[Venue Intelligence] event', {
      event: event.displayTitle,
      location: raw,
      normalizedKey: classification.normalizedKey,
      status,
      coords: coords ?? null,
    });
  }
}
