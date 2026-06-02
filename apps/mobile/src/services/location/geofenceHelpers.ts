/**
 * Pure geofence helpers — no React, no Expo, no platform dependencies.
 * Testable in Node via tsx --test.
 */

import type { CurrentRegion, KnownLocation } from '@/store/locationStore';

const EARTH_RADIUS_METERS = 6_371_000;

/** Threshold below which home and work are considered the same place. */
export const SAME_LOCATION_THRESHOLD_METERS = 100;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Haversine great-circle distance between two coordinates, in metres.
 * Accurate to within ~0.5% for the distances relevant to home/work detection.
 */
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a));
}

/**
 * Returns true when two known locations are within the given threshold of each other.
 * Used to detect invalid setup where Home and Work have been set to the same place.
 */
export function locationsTooClose(
  a: KnownLocation,
  b: KnownLocation,
  thresholdMeters = SAME_LOCATION_THRESHOLD_METERS,
): boolean {
  return haversineDistanceMeters(a.latitude, a.longitude, b.latitude, b.longitude) <= thresholdMeters;
}

/**
 * Returns true when a coordinate is within a known location's radius.
 */
export function isWithinRegion(
  currentLat: number,
  currentLon: number,
  known: KnownLocation,
): boolean {
  const distance = haversineDistanceMeters(currentLat, currentLon, known.latitude, known.longitude);
  return distance <= known.radiusMeters;
}

/**
 * Resolves which named region a coordinate falls in.
 * Returns 'unknown' if home and work are set to the same place — ambiguous data.
 * Home is checked before work; returns 'away' if neither matches.
 */
export function resolveCurrentRegion(
  currentLat: number,
  currentLon: number,
  home: KnownLocation | null,
  work: KnownLocation | null,
): CurrentRegion {
  // If both locations are configured but indistinguishably close, region is ambiguous.
  if (home && work && locationsTooClose(home, work)) return 'unknown';
  if (home && isWithinRegion(currentLat, currentLon, home)) return 'home';
  if (work && isWithinRegion(currentLat, currentLon, work)) return 'work';
  if (home || work) return 'away';
  return 'unknown';
}
