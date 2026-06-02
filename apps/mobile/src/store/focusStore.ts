import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// ── Day-scoping helpers ───────────────────────────────────────────────────────

/**
 * Returns the local calendar date as "YYYY-MM-DD".
 * Exported for tests — pure, no side effects.
 */
export function todayLocalDateString(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns the completedIds array scoped to today.
 * If storedDate differs from today, the array is reset to [].
 * Exported for tests — pure, no side effects.
 *
 * @param storedIds   - Persisted completedIds from previous store state.
 * @param storedDate  - The YYYY-MM-DD date those ids were recorded on, or null.
 * @param today       - The current local date string (YYYY-MM-DD).
 */
export function resolveCompletedIds(
  storedIds: string[],
  storedDate: string | null,
  today: string,
): string[] {
  return storedDate === today ? storedIds : [];
}

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
  /**
   * Local date string (YYYY-MM-DD) for the day completedIds belongs to.
   * When this differs from today, completedIds is reset before the next operation.
   * Null means completedIds has never been set (treat as new day).
   */
  completedIdsDate: string | null;
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
  'completedIds' | 'completedIdsDate' | 'snoozedItems' | 'momentumProgress'
>;

export const useFocusStore = create<FocusState>()(
  persist(
    (set, get) => ({
      completedIds: [],
      completedIdsDate: null,
      snoozedItems: [],
      pendingUndo: null,
      momentumProgress: INITIAL_MOMENTUM,

      completeItem: (id: string, title: string) => {
        const prevUndo = get().pendingUndo;
        const today = todayLocalDateString();

        set((state) => {
          // Day-scoped reset: if this is the first completion of a new day, start fresh.
          const isNewDay = state.completedIdsDate !== today;
          const baseIds = resolveCompletedIds(state.completedIds, state.completedIdsDate, today);

          let completedIds = baseIds.includes(id) ? baseIds : [...baseIds, id];
          let momentumProgress = Math.min(
            MOMENTUM_MAX,
            state.momentumProgress + MOMENTUM_COMPLETE_DELTA,
          );

          // New completion while another undo is active on the same day:
          // restore the prior item instead of silently committing it.
          // Cross-day: skip — prevUndo is from a previous day and already stale.
          if (!isNewDay && prevUndo && prevUndo.itemId !== id) {
            completedIds = completedIds.filter((cid) => cid !== prevUndo.itemId);
            momentumProgress = Math.max(
              MOMENTUM_MIN,
              momentumProgress - MOMENTUM_COMPLETE_DELTA,
            );
          }

          return {
            completedIds,
            completedIdsDate: today,
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
        completedIdsDate: state.completedIdsDate,
        snoozedItems: state.snoozedItems,
        momentumProgress: state.momentumProgress,
      }),
      merge: (persisted, current) => {
        const p = persisted as PersistedFocusSlice | undefined;
        const today = todayLocalDateString();
        // On hydration: clear completedIds if the persisted date is from a previous day.
        // This handles the "next-day app open" reset without requiring an explicit action.
        const completedIds = resolveCompletedIds(
          p?.completedIds ?? [],
          p?.completedIdsDate ?? null,
          today,
        );
        return {
          ...current,
          snoozedItems: p?.snoozedItems ?? [],
          momentumProgress: p?.momentumProgress ?? INITIAL_MOMENTUM,
          completedIds,
          completedIdsDate: today,
          pendingUndo: null,
        };
      },
    },
  ),
);
