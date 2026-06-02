/**
 * Meridian — useLocationRegion (Phase G.1)
 *
 * Refreshes the user's current region once per app foreground.
 *
 * Design:
 * - Single GPS fix per foreground event — no continuous polling.
 * - Fails safely to 'unknown' if permission denied or GPS unavailable.
 * - Does not request permission — that only happens when the user taps
 *   "Set Home" or "Set Work" in Settings.
 * - Also runs once on mount (covers first app open after Home/Work are set).
 *
 * Phase G.2 will read currentRegion from locationStore to adjust leave alert
 * copy. This hook has no knowledge of that — it only maintains region state.
 */

import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { resolveCurrentRegionFromDevice } from '@/services/location/geofenceManager';
import { useLocationStore } from '@/store/locationStore';

export function useLocationRegion(): void {
  const homeLocation = useLocationStore((s) => s.homeLocation);
  const workLocation = useLocationStore((s) => s.workLocation);
  const setCurrentRegion = useLocationStore((s) => s.setCurrentRegion);
  const setLocationPermission = useLocationStore((s) => s.setLocationPermission);

  useEffect(() => {
    let prevState: AppStateStatus = AppState.currentState;

    const refresh = async () => {
      const { region, permissionState } = await resolveCurrentRegionFromDevice(
        homeLocation,
        workLocation,
      );
      setCurrentRegion(region);
      setLocationPermission(permissionState);
    };

    // Refresh on foreground transition.
    const sub = AppState.addEventListener('change', (next) => {
      const wasBackground = prevState === 'background' || prevState === 'inactive';
      if (wasBackground && next === 'active') {
        void refresh();
      }
      prevState = next;
    });

    // Also refresh on mount — covers first open after locations are saved.
    void refresh();

    return () => sub.remove();
  // Re-register when stored locations change so the next foreground uses
  // the latest home/work coordinates.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeLocation, workLocation]);
}
