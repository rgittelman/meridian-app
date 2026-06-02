/**
 * ETA provider abstraction — Phase H.1
 *
 * Hides the external routing API behind an interface so the traffic
 * intelligence service is not coupled to any specific provider.
 * The notification pipeline never references this directly.
 *
 * Providers:
 *   NullEtaProvider           — always returns null; used when no API key
 *                               is configured or as a safe fallback.
 *   GoogleDistanceMatrixProvider — single HTTPS fetch to the Distance Matrix
 *                               API with departure_time=now&traffic_model=best_guess.
 *
 * Field semantics:
 *   baselineMinutes — duration.value / 60. Road-speed estimate for this time
 *                     of day; does not include real-time traffic signal data.
 *   trafficMinutes  — duration_in_traffic.value / 60. Current-traffic estimate.
 */

import type { VenueCoordinates } from './venueIntelligence';

export type TravelTimeResult = {
  /** duration.value / 60 — road-speed baseline, no live traffic signal. */
  baselineMinutes: number;
  /** duration_in_traffic.value / 60 — current-traffic estimate. */
  trafficMinutes: number;
};

export interface EtaProvider {
  fetchTravelTime(
    origin: VenueCoordinates,
    destination: VenueCoordinates,
  ): Promise<TravelTimeResult | null>;
}

// ── NullEtaProvider ───────────────────────────────────────────────────────────

/** Safe no-op provider. Used when no API key is present. */
export class NullEtaProvider implements EtaProvider {
  async fetchTravelTime(
    _origin: VenueCoordinates,
    _destination: VenueCoordinates,
  ): Promise<TravelTimeResult | null> {
    return null;
  }
}

// ── GoogleDistanceMatrixProvider ──────────────────────────────────────────────

const DISTANCE_MATRIX_URL =
  'https://maps.googleapis.com/maps/api/distancematrix/json';

/** Single-element Distance Matrix call with current-traffic estimate. */
export class GoogleDistanceMatrixProvider implements EtaProvider {
  constructor(private readonly apiKey: string) {}

  async fetchTravelTime(
    origin: VenueCoordinates,
    destination: VenueCoordinates,
  ): Promise<TravelTimeResult | null> {
    try {
      const params = new URLSearchParams({
        origins: `${origin.latitude},${origin.longitude}`,
        destinations: `${destination.latitude},${destination.longitude}`,
        mode: 'driving',
        departure_time: 'now',
        traffic_model: 'best_guess',
        key: this.apiKey,
      });

      const response = await fetch(`${DISTANCE_MATRIX_URL}?${params.toString()}`);
      if (!response.ok) return null;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const data = await response.json();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const element = data?.rows?.[0]?.elements?.[0] as Record<string, unknown> | undefined;

      if (!element || element['status'] !== 'OK') return null;

      const baselineSeconds = (element['duration'] as { value?: number } | undefined)?.value;
      const trafficSeconds = (
        element['duration_in_traffic'] as { value?: number } | undefined
      )?.value;

      if (typeof baselineSeconds !== 'number' || typeof trafficSeconds !== 'number') {
        return null;
      }

      return {
        baselineMinutes: Math.round(baselineSeconds / 60),
        trafficMinutes: Math.round(trafficSeconds / 60),
      };
    } catch {
      return null;
    }
  }
}
