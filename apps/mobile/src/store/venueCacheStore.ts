import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { VenueCacheEntry } from '@/services/location/venueIntelligence';

type VenueCacheState = {
  entries: Record<string, VenueCacheEntry>;
  setEntry: (key: string, entry: VenueCacheEntry) => void;
  clearAll: () => void;
};

export const useVenueCacheStore = create<VenueCacheState>()(
  persist(
    (set) => ({
      entries: {},

      setEntry: (key, entry) =>
        set((state) => ({
          entries: { ...state.entries, [key]: entry },
        })),

      clearAll: () => set({ entries: {} }),
    }),
    {
      name: 'meridian-venue-cache-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ entries: state.entries }),
    },
  ),
);
