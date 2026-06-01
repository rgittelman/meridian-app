import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// ── Snooze timing options ─────────────────────────────────────────────────────

export type SnoozeTiming = 'later-today' | 'tomorrow-morning' | 'this-weekend';

export const SNOOZE_LABELS: Record<SnoozeTiming, string> = {
  'later-today':       'Later today',
  'tomorrow-morning':  'Tomorrow morning',
  'this-weekend':      'This weekend',
};

/** Approximate hours from now before the snoozed item re-emerges */
export const SNOOZE_HOURS: Record<SnoozeTiming, number> = {
  'later-today':      3,
  'tomorrow-morning': 14,
  'this-weekend':     60,
};

export type SnoozedItem = {
  id: string;
  timing: SnoozeTiming;
  snoozedAt: number; // epoch ms
};

// ── Pending undo ──────────────────────────────────────────────────────────────

export type PendingUndo = {
  itemId: string;
  title: string;
  completedAt: number; // epoch ms
};

// ── Store ─────────────────────────────────────────────────────────────────────

type FocusState = {
  completedIds: string[];
  snoozedItems: SnoozedItem[];
  /** Ephemeral — not persisted across app restarts */
  pendingUndo: PendingUndo | null;
  momentumProgress: number;

  completeItem: (id: string, title: string) => void;
  undoCompletion: () => void;
  commitCompletion: () => void;
  snoozeItem: (id: string, timing: SnoozeTiming) => void;
  unsnoozeItem: (id: string) => void;
  /** Remove snoozed items whose intended return window has elapsed. */
  expireSnoozedItems: () => void;
  setMomentumProgress: (progress: number) => void;
};

const MOMENTUM_COMPLETE_DELTA = 0.04;
const MOMENTUM_MIN = 0.1;
const MOMENTUM_MAX = 1.0;
const INITIAL_MOMENTUM = 0.65;

type PersistedFocusSlice = Pick<
  FocusState,
  'completedIds' | 'snoozedItems' | 'momentumProgress'
>;

export const useFocusStore = create<FocusState>()(
  persist(
    (set, get) => ({
      completedIds: [],
      snoozedItems: [],
      pendingUndo: null,
      momentumProgress: INITIAL_MOMENTUM,

      completeItem: (id: string, title: string) => {
        const prevUndo = get().pendingUndo;

        set((state) => {
          let completedIds = state.completedIds.includes(id)
            ? state.completedIds
            : [...state.completedIds, id];
          let momentumProgress = Math.min(
            MOMENTUM_MAX,
            state.momentumProgress + MOMENTUM_COMPLETE_DELTA,
          );

          // New completion while another undo is active: restore the prior item
          // instead of silently committing it.
          if (prevUndo && prevUndo.itemId !== id) {
            completedIds = completedIds.filter((cid) => cid !== prevUndo.itemId);
            momentumProgress = Math.max(
              MOMENTUM_MIN,
              momentumProgress - MOMENTUM_COMPLETE_DELTA,
            );
          }

          return {
            completedIds,
            pendingUndo: { itemId: id, title, completedAt: Date.now() },
            momentumProgress,
          };
        });
      },

      undoCompletion: () => {
        const { pendingUndo } = get();
        if (!pendingUndo) return;

        set((state) => ({
          completedIds: state.completedIds.filter((cid) => cid !== pendingUndo.itemId),
          pendingUndo: null,
          momentumProgress: Math.max(
            MOMENTUM_MIN,
            state.momentumProgress - MOMENTUM_COMPLETE_DELTA,
          ),
        }));
      },

      commitCompletion: () => {
        set({ pendingUndo: null });
      },

      snoozeItem: (id: string, timing: SnoozeTiming) => {
        set((state) => ({
          snoozedItems: [
            ...state.snoozedItems.filter((s) => s.id !== id),
            { id, timing, snoozedAt: Date.now() },
          ],
        }));
      },

      unsnoozeItem: (id: string) => {
        set((state) => ({
          snoozedItems: state.snoozedItems.filter((s) => s.id !== id),
        }));
      },

      expireSnoozedItems: () => {
        const now = Date.now();
        set((state) => ({
          snoozedItems: state.snoozedItems.filter(
            (s) => now < s.snoozedAt + SNOOZE_HOURS[s.timing] * 3_600_000,
          ),
        }));
      },

      setMomentumProgress: (progress: number) => {
        set({
          momentumProgress: Math.min(MOMENTUM_MAX, Math.max(MOMENTUM_MIN, progress)),
        });
      },
    }),
    {
      name: 'meridian-focus-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state): PersistedFocusSlice => ({
        completedIds: state.completedIds,
        snoozedItems: state.snoozedItems,
        momentumProgress: state.momentumProgress,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as PersistedFocusSlice | undefined),
        pendingUndo: null,
      }),
    },
  ),
);
