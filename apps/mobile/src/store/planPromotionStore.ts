import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { PromotedPlanItemStatus } from '@/types/plan';

type PlanPromotionState = {
  /** Per-capture plan overlay — keyed by sourceCaptureId */
  statusByCaptureId: Record<string, PromotedPlanItemStatus>;

  getStatus: (captureId: string) => PromotedPlanItemStatus;
  markHandled: (captureId: string) => void;
  markHeld: (captureId: string) => void;
  dismissFromPlan: (captureId: string) => void;
  clearStatus: (captureId: string) => void;
  pruneMissingCaptures: (activeCaptureIds: string[]) => void;
};

export const usePlanPromotionStore = create<PlanPromotionState>()(
  persist(
    (set, get) => ({
      statusByCaptureId: {},

      getStatus: (captureId) => get().statusByCaptureId[captureId] ?? 'active',

      markHandled: (captureId) => {
        set((state) => ({
          statusByCaptureId: {
            ...state.statusByCaptureId,
            [captureId]: 'handled',
          },
        }));
      },

      markHeld: (captureId) => {
        set((state) => ({
          statusByCaptureId: {
            ...state.statusByCaptureId,
            [captureId]: 'held',
          },
        }));
      },

      dismissFromPlan: (captureId) => {
        set((state) => ({
          statusByCaptureId: {
            ...state.statusByCaptureId,
            [captureId]: 'dismissed',
          },
        }));
      },

      clearStatus: (captureId) => {
        set((state) => {
          const next = { ...state.statusByCaptureId };
          delete next[captureId];
          return { statusByCaptureId: next };
        });
      },

      pruneMissingCaptures: (activeCaptureIds) => {
        const keep = new Set(activeCaptureIds);
        set((state) => {
          const next: Record<string, PromotedPlanItemStatus> = {};
          for (const [id, status] of Object.entries(state.statusByCaptureId)) {
            if (keep.has(id)) next[id] = status;
          }
          return { statusByCaptureId: next };
        });
      },
    }),
    {
      name: 'meridian-plan-promotions-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ statusByCaptureId: state.statusByCaptureId }),
    },
  ),
);
