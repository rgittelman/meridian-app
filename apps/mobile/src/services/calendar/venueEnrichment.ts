/**
 * Phase H0 — Venue Enrichment
 *
 * Opportunistically resolves venue coordinates for calendar events after sync.
 * Called fire-and-forget from calendarStore — never blocks event display.
 *
 * Returns a Record<eventId, VenueCoordinates> for events whose location strings
 * resolve to coordinates. Events with no location, vague strings, or geocode
 * failures are omitted from the result.
 *
 * Does NOT modify MeridianCalendarEvent — the locked calendar type is untouched.
 * Coordinates are stored separately in calendarStore as non-persisted state,
 * ready for Phase H (traffic-aware routing) to consume.
 *
 * Deduplication: multiple events sharing the same location string make only
 * one geocode call. The result is mapped to all matching event IDs.
 */

import type { MeridianCalendarEvent } from '@/types/calendar';
import { classifyVenueLocation } from '@/services/location/venueIntelligence';
import { geocodeVenueIfNeeded, type VenueCoordinates } from '@/services/location/venueGeocoder';
import { isDevEnvironment } from '@/utils/isDev';

export type VenueCoordinatesMap = Record<string, VenueCoordinates>;

export async function enrichEventsWithVenueCoordinates(
  events: MeridianCalendarEvent[],
): Promise<VenueCoordinatesMap> {
  // Deduplicate events by normalized location key → collect associated event IDs.
  const keyToEventIds = new Map<string, string[]>();
  let skippedCount = 0;

  for (const event of events) {
    if (!event.location) continue;

    const classification = classifyVenueLocation(event.location);

    if (!classification.shouldGeocode) {
      skippedCount += 1;
      if (isDevEnvironment()) {
        console.log('[Venue Intelligence] event skipped', {
          eventId: event.id,
          location: event.location,
          reason: classification.reason,
        });
      }
      continue;
    }

    const ids = keyToEventIds.get(classification.normalizedKey) ?? [];
    ids.push(event.id);
    keyToEventIds.set(classification.normalizedKey, ids);
  }

  const result: VenueCoordinatesMap = {};
  const rawByKey = new Map<string, string>();

  // Collect one raw location string per key (for geocoding).
  for (const event of events) {
    if (!event.location) continue;
    const classification = classifyVenueLocation(event.location);
    if (classification.shouldGeocode && !rawByKey.has(classification.normalizedKey)) {
      rawByKey.set(classification.normalizedKey, event.location);
    }
  }

  // Geocode each unique venue string once, then fan out to all event IDs.
  const geocodePromises = Array.from(keyToEventIds.entries()).map(
    async ([key, eventIds]) => {
      const raw = rawByKey.get(key);
      if (!raw) return;

      const coords = await geocodeVenueIfNeeded(raw);
      if (!coords) return;

      for (const id of eventIds) {
        result[id] = coords;
      }
    },
  );

  await Promise.allSettled(geocodePromises);

  if (isDevEnvironment()) {
    console.log('[Venue Intelligence] enrichment complete', {
      totalEvents: events.length,
      withLocation: events.filter((e) => e.location).length,
      uniqueVenues: keyToEventIds.size,
      skipped: skippedCount,
      resolved: Object.keys(result).length,
    });
  }

  return result;
}
