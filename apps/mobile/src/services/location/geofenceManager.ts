/**
 * Meridian — geofenceManager (Phase G.1)
 *
 * Location foundation: point-in-time region detection.
 *
 * Design:
 * - Pure helpers (haversineDistanceMeters, isWithinRegion, resolveCurrentRegion)
 *   are testable in Node without React or Expo.
 * - Async functions (requestLocationPermission, captureCurrentLocation,
 *   resolveCurrentRegionFromDevice) are the only parts that touch Expo APIs.
 * - No continuous polling. No background location. No geofence registration.
 * - One GPS fix per app foreground — balanced accuracy reduces battery impact.
 * - Fails safely to 'unknown' on any error (permission denied, timeout, unavailable).
 *
 * Phase G.2 will connect resolveCurrentRegion to generateLeaveAlert.
 * Phase H will connect traffic data to ETA calculations.
 * Neither belongs here.
 */

import * as ExpoLocation from 'expo-location';

import type { CurrentRegion, KnownLocation, LocationPermissionState } from '@/store/locationStore';
import { resolveCurrentRegion } from './geofenceHelpers';

// Re-export pure helpers so callers can import from one place.
export { haversineDistanceMeters, isWithinRegion, resolveCurrentRegion } from './geofenceHelpers';

// ── Async Expo-backed functions ───────────────────────────────────────────────

/**
 * Maps an Expo permission status to Meridian's LocationPermissionState.
 */
function mapExpoPermission(
  status: ExpoLocation.PermissionStatus,
): LocationPermissionState {
  if (status === ExpoLocation.PermissionStatus.GRANTED) return 'granted';
  if (status === ExpoLocation.PermissionStatus.DENIED) return 'denied';
  return 'unknown';
}

/**
 * Returns the current when-in-use permission state without prompting.
 */
export async function getLocationPermissionState(): Promise<LocationPermissionState> {
  try {
    const { status } = await ExpoLocation.getForegroundPermissionsAsync();
    return mapExpoPermission(status);
  } catch {
    return 'unavailable';
  }
}

/**
 * Requests when-in-use location permission.
 * Only call in response to an explicit user action (tapping Set Home / Set Work).
 * Never call automatically on app launch.
 */
export async function requestLocationPermission(): Promise<LocationPermissionState> {
  try {
    const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
    return mapExpoPermission(status);
  } catch {
    return 'unavailable';
  }
}

/**
 * Reads a single GPS fix at balanced accuracy.
 * Returns null on any error (permission denied, timeout, unavailable).
 * Does NOT request permission — caller must ensure permission is granted first.
 */
export async function captureCurrentLocation(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  try {
    const position = await ExpoLocation.getCurrentPositionAsync({
      accuracy: ExpoLocation.Accuracy.Balanced,
    });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch {
    return null;
  }
}

/**
 * Reads a single GPS fix and resolves which region the user is in.
 * Returns 'unknown' on any failure — never throws.
 */
export async function resolveCurrentRegionFromDevice(
  home: KnownLocation | null,
  work: KnownLocation | null,
): Promise<{ region: CurrentRegion; permissionState: LocationPermissionState }> {
  const permissionState = await getLocationPermissionState();
  if (permissionState !== 'granted') {
    return { region: 'unknown', permissionState };
  }

  const position = await captureCurrentLocation();
  if (!position) {
    return { region: 'unknown', permissionState };
  }

  const region = resolveCurrentRegion(position.latitude, position.longitude, home, work);
  return { region, permissionState };
}
