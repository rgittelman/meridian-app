/**
 * Traffic estimate cache — Phase H.1
 *
 * Non-persisted (session-only). Traffic estimates are time-bound — they are
 * meaningless after the event passes and should not survive an app restart.
 * Contrast with venueCacheStore, which persists venue coordinates indefinitely.
 */

import { create } from 'zustand';

import type { TrafficCacheEntry } from '@/services/location/trafficIntelligence';

type TrafficCacheState = {
  entries: Record<string, TrafficCacheEntry>;
  setEntry: (key: string, entry: TrafficCacheEntry) => void;
  clearAll: () => void;
};

export const useTrafficCacheStore = create<TrafficCacheState>((set) => ({
  entries: {},

  setEntry: (key, entry) =>
    set((state) => ({
      entries: { ...state.entries, [key]: entry },
    })),

  clearAll: () => set({ entries: {} }),
}));
