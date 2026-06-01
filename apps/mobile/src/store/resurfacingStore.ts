import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { CooldownEntry } from '@/services/resurfacing/types';

type ResurfacingState = {
  cooldowns: Record<string, CooldownEntry>;
  dismissedIds: string[];
  lastInsight: string | null;

  markSurfaced: (id: string) => void;
  deferItem: (id: string) => void;
  dismissItem: (id: string) => void;
  setLastInsight: (insight: string | null) => void;
};

type PersistedResurfacingSlice = Pick<
  ResurfacingState,
  'cooldowns' | 'dismissedIds' | 'lastInsight'
>;

export const useResurfacingStore = create<ResurfacingState>()(
  persist(
    (set, get) => ({
      cooldowns: {},
      dismissedIds: [],
      lastInsight: null,

      markSurfaced: (id: string) => {
        set((state) => ({
          cooldowns: {
            ...state.cooldowns,
            [id]: {
              lastSurfacedAt: Date.now(),
              deferCount: state.cooldowns[id]?.deferCount ?? 0,
            },
          },
        }));
      },

      deferItem: (id: string) => {
        set((state) => {
          const existing = state.cooldowns[id];
          return {
            cooldowns: {
              ...state.cooldowns,
              [id]: {
                lastSurfacedAt: Date.now(),
                deferCount: (existing?.deferCount ?? 0) + 1,
              },
            },
          };
        });
      },

      dismissItem: (id: string) => {
        set((state) => ({
          dismissedIds: state.dismissedIds.includes(id)
            ? state.dismissedIds
            : [...state.dismissedIds, id],
        }));
      },

      setLastInsight: (insight: string | null) => {
        if (get().lastInsight === insight) return;
        set({ lastInsight: insight });
      },
    }),
    {
      name: 'meridian-resurfacing-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state): PersistedResurfacingSlice => ({
        cooldowns: state.cooldowns,
        dismissedIds: state.dismissedIds,
        lastInsight: state.lastInsight,
      }),
    },
  ),
);
