/**
 * Phase H0 — Venue Geocoder
 *
 * Resolves a raw calendar event location string to coordinates, using the
 * venue cache to avoid redundant geocode calls and suppress retry loops
 * after failures.
 *
 * Design:
 * - Reads from venueCacheStore before calling geocodeAddress.
 * - Writes success and failure entries back to the cache.
 * - Failures are suppressed for 24 hours (VENUE_FAILURE_RETRY_MS).
 * - Vague/virtual/blank strings are filtered before any network call.
 * - Never throws — returns null on any failure or skip.
 *
 * This layer has no knowledge of notification timing, leave alerts,
 * or traffic. It only resolves venue strings to coordinates.
 */

import { geocodeAddress } from '@/services/location/geofenceManager';
import {
  classifyVenueLocation,
  resolveVenueCacheDecision,
  type VenueCoordinates,
} from '@/services/location/venueIntelligence';
import { useVenueCacheStore } from '@/store/venueCacheStore';
import { isDevEnvironment } from '@/utils/isDev';

export type { VenueCoordinates };

/**
 * Returns coordinates for a venue location string.
 * Uses the cache when possible; geocodes when necessary.
 * Returns null for vague/virtual strings, cached failures, or geocode errors.
 */
export async function geocodeVenueIfNeeded(
  rawLocation: string,
): Promise<VenueCoordinates | null> {
  const classification = classifyVenueLocation(rawLocation);

  if (!classification.shouldGeocode) {
    if (isDevEnvironment()) {
      console.log('[Venue Intelligence] skipped', {
        location: rawLocation,
        reason: classification.reason,
      });
    }
    return null;
  }

  const { normalizedKey } = classification;
  const store = useVenueCacheStore.getState();
  const existing = store.entries[normalizedKey];
  const decision = resolveVenueCacheDecision(existing, Date.now());

  if (decision === 'use_cached_success' && existing?.coordinates) {
    if (isDevEnvironment()) {
      console.log('[Venue Intelligence] cache hit', { normalizedKey });
    }
    return existing.coordinates;
  }

  if (decision === 'skip_recent_failure') {
    if (isDevEnvironment()) {
      console.log('[Venue Intelligence] skip recent failure', { normalizedKey });
    }
    return null;
  }

  // decision === 'attempt'
  if (isDevEnvironment()) {
    console.log('[Venue Intelligence] geocoding', {
      normalizedKey,
      source: rawLocation,
    });
  }

  const coords = await geocodeAddress(rawLocation);

  store.setEntry(normalizedKey, {
    normalizedKey,
    sourceString: rawLocation,
    coordinates: coords,
    geocodeSucceeded: coords !== null,
    lastAttemptedAt: Date.now(),
  });

  if (isDevEnvironment()) {
    console.log('[Venue Intelligence] geocode result', {
      normalizedKey,
      success: coords !== null,
    });
  }

  return coords;
}
