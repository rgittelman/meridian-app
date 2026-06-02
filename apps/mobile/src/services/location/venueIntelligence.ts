/**
 * Pure venue intelligence helpers — no React, no Expo, no network.
 * Testable in Node via tsx --test.
 *
 * Decides whether a raw location string from a calendar event is worth
 * geocoding, and provides the stable cache keys and cache-reading logic
 * used by venueGeocoder.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type VenueCoordinates = { latitude: number; longitude: number };

export type VenueGeocodabilityResult =
  | { shouldGeocode: true; normalizedKey: string }
  | { shouldGeocode: false; reason: 'blank' | 'vague' | 'virtual' | 'too_short' };

export type VenueCacheEntry = {
  normalizedKey: string;
  /** Raw location string that was geocoded — preserved for diagnostics. */
  sourceString: string;
  coordinates: VenueCoordinates | null;
  geocodeSucceeded: boolean;
  lastAttemptedAt: number;
};

/** How long to suppress retries after a geocode failure. */
export const VENUE_FAILURE_RETRY_MS = 24 * 60 * 60 * 1000;

// ── Classification ────────────────────────────────────────────────────────────

const VAGUE_TERMS = new Set([
  '',
  'tbd',
  'tba',
  'away',
  'home',
  'n/a',
  'na',
  'none',
  'virtual',
  'online',
  'remote',
  'to be determined',
  'to be announced',
  'location tbd',
  'location tba',
]);

const VIRTUAL_PATTERNS: RegExp[] = [
  /^https?:\/\//i,
  /zoom\.us/i,
  /meet\.google/i,
  /teams\.microsoft/i,
  /webex\.com/i,
  /gotomeeting/i,
  /hangouts/i,
  /skype\.com/i,
  /^\+?1?\s*\(?\d{3}\)?\s*[\d\-\s]{7,}$/, // phone dial-in numbers
];

/**
 * Produces a stable, lowercase cache key from a raw location string.
 * Same input always produces the same key.
 */
export function normalizeVenueLocation(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:]+$/, '');
}

/**
 * Returns whether a raw location string should be geocoded,
 * and the reason if not. Use for diagnostics.
 */
export function classifyVenueLocation(raw: string): VenueGeocodabilityResult {
  const normalized = normalizeVenueLocation(raw);

  if (!normalized) {
    return { shouldGeocode: false, reason: 'blank' };
  }

  // Check vague terms before length so short known-bad strings like 'tbd', 'n/a'
  // are reported as 'vague' rather than 'too_short'.
  if (VAGUE_TERMS.has(normalized)) {
    return { shouldGeocode: false, reason: 'vague' };
  }

  if (normalized.length < 4) {
    return { shouldGeocode: false, reason: 'too_short' };
  }

  if (VIRTUAL_PATTERNS.some((p) => p.test(raw.trim()))) {
    return { shouldGeocode: false, reason: 'virtual' };
  }

  return { shouldGeocode: true, normalizedKey: normalized };
}

/** Returns true when the raw location string is worth geocoding. */
export function shouldAttemptVenueGeocode(raw: string): boolean {
  return classifyVenueLocation(raw).shouldGeocode;
}

// ── Cache decision ────────────────────────────────────────────────────────────

/**
 * Decides how to handle a cache lookup for a venue geocode request.
 * Pure — no side effects, no network. Designed to be testable in isolation.
 */
export function resolveVenueCacheDecision(
  entry: VenueCacheEntry | undefined,
  nowMs: number,
): 'use_cached_success' | 'skip_recent_failure' | 'attempt' {
  if (!entry) return 'attempt';
  if (entry.geocodeSucceeded) return 'use_cached_success';
  const ageMs = nowMs - entry.lastAttemptedAt;
  if (ageMs < VENUE_FAILURE_RETRY_MS) return 'skip_recent_failure';
  return 'attempt';
}
