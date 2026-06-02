import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type LocationPermissionState =
  | 'unknown'    // not yet requested
  | 'granted'    // when-in-use permission granted
  | 'denied'     // user denied
  | 'unavailable'; // device does not support location

export type CurrentRegion = 'home' | 'work' | 'away' | 'unknown';

export type KnownLocation = {
  label: 'home' | 'work';
  latitude: number;
  longitude: number;
  /** Radius in metres — default 150 m covers home + driveway. */
  radiusMeters: number;
  /** Human-readable address — set from geocoding or reverse-geocoding. Optional for backwards compat. */
  address?: string;
};

export const DEFAULT_REGION_RADIUS_METERS = 150;

type LocationState = {
  homeLocation: KnownLocation | null;
  workLocation: KnownLocation | null;
  /** Re-derived each foreground — not persisted. */
  currentRegion: CurrentRegion;
  /** Always re-checked on each permission request — not persisted. */
  locationPermission: LocationPermissionState;
  /**
   * Stored now; gates leave alert copy change in Phase G.2.
   * Does not affect Phase E behavior.
   */
  smartLeaveTimingEnabled: boolean;

  setHomeLocation: (loc: KnownLocation | null) => void;
  setWorkLocation: (loc: KnownLocation | null) => void;
  setCurrentRegion: (region: CurrentRegion) => void;
  setLocationPermission: (state: LocationPermissionState) => void;
  setSmartLeaveTimingEnabled: (v: boolean) => void;
};

type PersistedLocationSlice = Pick<
  LocationState,
  'homeLocation' | 'workLocation' | 'smartLeaveTimingEnabled'
>;

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      homeLocation: null,
      workLocation: null,
      currentRegion: 'unknown',
      locationPermission: 'unknown',
      smartLeaveTimingEnabled: true,

      setHomeLocation: (loc) => set({ homeLocation: loc }),
      setWorkLocation: (loc) => set({ workLocation: loc }),
      setCurrentRegion: (region) => set({ currentRegion: region }),
      setLocationPermission: (state) => set({ locationPermission: state }),
      setSmartLeaveTimingEnabled: (v) => set({ smartLeaveTimingEnabled: v }),
    }),
    {
      name: 'meridian-location-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state): PersistedLocationSlice => ({
        homeLocation: state.homeLocation,
        workLocation: state.workLocation,
        smartLeaveTimingEnabled: state.smartLeaveTimingEnabled,
      }),
    },
  ),
);
