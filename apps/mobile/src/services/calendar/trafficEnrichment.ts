/**
 * Phase H.1 — Traffic Enrichment
 *
 * Resolves travel time estimates for calendar events that are:
 *   - Household-relevant and not all-day
 *   - Starting within the near-term enrichment window
 *   - Have a resolved venue coordinate (from venueEnrichment)
 *
 * Called fire-and-forget from calendarStore after venue enrichment resolves.
 * Returns Record<eventId, TrafficEstimate> — stored in calendarStore as
 * non-persisted state. The notification pipeline reads from this map in H.2.
 *
 * Guardrails:
 *   - Only enriches events within TRAFFIC_ENRICHMENT_WINDOW_HOURS (4h).
 *     Prevents unnecessary API calls for events days away.
 *   - Skips events with no venue coordinates or no home location.
 *   - Cache-first: hits trafficCacheStore before calling the ETA provider.
 *   - NullEtaProvider when no API key — zero behavior change from G.2.
 */

import type { MeridianCalendarEvent } from '@/types/calendar';
import type { KnownLocation } from '@/store/locationStore';
import type { VenueCoordinates } from '@/services/location/venueIntelligence';
import type { EtaProvider } from '@/services/location/etaProvider';
import {
  buildTrafficCacheKey,
  formatEventDate,
  isHeavierTraffic,
  isTrafficEstimateStale,
  type TrafficEstimate,
} from '@/services/location/trafficIntelligence';
import { useTrafficCacheStore } from '@/store/trafficCacheStore';
import { isHouseholdRelevant } from '@/services/relevance';
import { isDevEnvironment } from '@/utils/isDev';

/** Only enrich events starting within this many hours from now. */
export const TRAFFIC_ENRICHMENT_WINDOW_HOURS = 4;

export type TrafficEstimatesMap = Record<string, TrafficEstimate>;

/**
 * Resolves traffic estimates for near-term household events.
 * Returns a map of eventId → TrafficEstimate for events that resolved.
 */
export async function enrichEventsWithTrafficEstimates(
  events: MeridianCalendarEvent[],
  venueCoordinates: Record<string, VenueCoordinates>,
  homeLocation: KnownLocation | null,
  provider: EtaProvider,
  now = new Date(),
): Promise<TrafficEstimatesMap> {
  if (!homeLocation) {
    if (isDevEnvironment()) {
      console.log('[Traffic Intelligence] skipping enrichment — no home location set');
    }
    return {};
  }

  const origin: VenueCoordinates = {
    latitude: homeLocation.latitude,
    longitude: homeLocation.longitude,
  };

  const windowMs = TRAFFIC_ENRICHMENT_WINDOW_HOURS * 3600_000;
  const nowMs = now.getTime();

  // Filter to leave-alert-eligible, near-term events with known venue coords.
  const eligible = events.filter((event) => {
    if (event.allDay) return false;
    if (!isHouseholdRelevant(event)) return false;
    if (!venueCoordinates[event.id]) return false;
    const startMs = event.startTime.getTime();
    return startMs > nowMs && startMs - nowMs <= windowMs;
  });

  if (isDevEnvironment()) {
    console.log('[Traffic Intelligence] enriching', {
      totalEvents: events.length,
      eligibleForTraffic: eligible.length,
    });
  }

  const result: TrafficEstimatesMap = {};
  const cacheStore = useTrafficCacheStore.getState();

  const enrichPromises = eligible.map(async (event) => {
    const destination = venueCoordinates[event.id]!;
    const eventDate = formatEventDate(event.startTime);
    const cacheKey = buildTrafficCacheKey(
      origin.latitude,
      origin.longitude,
      destination.latitude,
      destination.longitude,
      eventDate,
    );

    const cached = cacheStore.entries[cacheKey];

    if (!isTrafficEstimateStale(cached, nowMs)) {
      if (isDevEnvironment()) {
        console.log('[Traffic Intelligence] cache hit', { eventId: event.id, cacheKey });
      }
      result[event.id] = {
        eventId: event.id,
        baselineMinutes: cached!.baselineMinutes,
        trafficMinutes: cached!.trafficMinutes,
        isHeavierThanUsual: isHeavierTraffic(cached!.baselineMinutes, cached!.trafficMinutes),
        fetchedAt: cached!.fetchedAt,
      };
      return;
    }

    if (isDevEnvironment()) {
      console.log('[Traffic Intelligence] fetching', {
        eventId: event.id,
        title: event.displayTitle,
        cacheKey,
      });
    }

    const travelTime = await provider.fetchTravelTime(origin, destination);

    if (!travelTime) {
      if (isDevEnvironment()) {
        console.log('[Traffic Intelligence] fetch returned null', { eventId: event.id });
      }
      return;
    }

    const fetchedAt = Date.now();

    cacheStore.setEntry(cacheKey, {
      cacheKey,
      eventId: event.id,
      baselineMinutes: travelTime.baselineMinutes,
      trafficMinutes: travelTime.trafficMinutes,
      fetchedAt,
    });

    result[event.id] = {
      eventId: event.id,
      baselineMinutes: travelTime.baselineMinutes,
      trafficMinutes: travelTime.trafficMinutes,
      isHeavierThanUsual: isHeavierTraffic(travelTime.baselineMinutes, travelTime.trafficMinutes),
      fetchedAt,
    };

    if (isDevEnvironment()) {
      console.log('[Traffic Intelligence] result', {
        eventId: event.id,
        baselineMinutes: travelTime.baselineMinutes,
        trafficMinutes: travelTime.trafficMinutes,
        isHeavierThanUsual: result[event.id]?.isHeavierThanUsual,
      });
    }
  });

  await Promise.allSettled(enrichPromises);

  if (isDevEnvironment()) {
    console.log('[Traffic Intelligence] enrichment complete', {
      eligible: eligible.length,
      resolved: Object.keys(result).length,
    });
  }

  return result;
}
