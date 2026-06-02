/**
 * Pure traffic intelligence helpers — no React, no Expo, no network.
 * Testable in Node via tsx --test.
 *
 * Provides types, cache-key construction, staleness logic, and the
 * heavier-than-usual threshold comparison used by trafficEnrichment.
 *
 * Field naming:
 *   baselineMinutes — duration.value / 60 from Distance Matrix.
 *                     Road-speed baseline for this time of day; NOT a
 *                     multi-week average. Named "baseline" because it is
 *                     the estimate without real-time traffic factored in.
 *   trafficMinutes  — duration_in_traffic.value / 60. Current-traffic
 *                     estimate at the time of the API call.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type TrafficEstimate = {
  eventId: string;
  baselineMinutes: number;
  trafficMinutes: number;
  isHeavierThanUsual: boolean;
  fetchedAt: number;
};

export type TrafficCacheEntry = {
  cacheKey: string;
  eventId: string;
  baselineMinutes: number;
  trafficMinutes: number;
  fetchedAt: number;
};

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Traffic is considered heavier than usual when trafficMinutes exceeds
 * baselineMinutes by more than this amount. Strictly greater than.
 */
export const HEAVY_TRAFFIC_THRESHOLD_MINUTES = 5;

/** Cache entries older than this are re-fetched. */
export const TRAFFIC_CACHE_TTL_MS = 30 * 60 * 1000;

// ── Pure helpers ──────────────────────────────────────────────────────────────

/**
 * Builds a stable cache key for a (origin, destination, date) triplet.
 * Coordinates are rounded to 4 decimal places (~11m precision).
 * Date is the local calendar date of the event in YYYY-MM-DD format.
 */
export function buildTrafficCacheKey(
  originLat: number,
  originLon: number,
  destLat: number,
  destLon: number,
  eventDate: string,
): string {
  const fmt = (n: number) => n.toFixed(4);
  return `${fmt(originLat)},${fmt(originLon)}→${fmt(destLat)},${fmt(destLon)}:${eventDate}`;
}

/**
 * Returns true when a cache entry is absent or older than the TTL.
 */
export function isTrafficEstimateStale(
  entry: TrafficCacheEntry | undefined,
  nowMs: number,
  ttlMs = TRAFFIC_CACHE_TTL_MS,
): boolean {
  if (!entry) return true;
  return nowMs - entry.fetchedAt >= ttlMs;
}

/**
 * Returns true when traffic adds more than thresholdMinutes over baseline.
 * Strictly greater-than so the boundary case is not flagged as heavy.
 */
export function isHeavierTraffic(
  baselineMinutes: number,
  trafficMinutes: number,
  thresholdMinutes = HEAVY_TRAFFIC_THRESHOLD_MINUTES,
): boolean {
  return trafficMinutes - baselineMinutes > thresholdMinutes;
}

/**
 * Formats a Date to a YYYY-MM-DD local-time string for use in cache keys.
 */
export function formatEventDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
