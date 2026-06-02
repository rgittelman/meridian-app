import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { SourceCalendarMeta } from '@/types/calendar';

type CalendarSelectionState = {
  /**
   * All calendars returned by the last successful fetchGoogleCalendarList.
   * Persisted so Settings can render the list without waiting for a sync.
   * Updated on every successful sync — names and membership stay current.
   */
  availableCalendars: SourceCalendarMeta[];

  /**
   * IDs the user has explicitly disabled (opt-out model).
   * Stored as an array for JSON serialization; treated as a set at runtime.
   * Default: empty — every calendar is enabled until the user opts out.
   * Stale IDs (from deleted calendars) are harmless — they match nothing.
   */
  disabledCalendarIds: string[];

  /**
   * Overwrites the stored calendar list.
   * Called after every successful fetchGoogleCalendarList so names and
   * membership stay current without requiring user action.
   */
  setAvailableCalendars: (calendars: SourceCalendarMeta[]) => void;

  /**
   * Enable or disable a calendar by ID.
   *
   * Guard: the primary Google calendar (sourceCalendarPrimary: true) cannot
   * be disabled. If `id` resolves to a primary calendar this is a no-op.
   * This guard lives in the store, not only in the UI.
   */
  setCalendarEnabled: (id: string, enabled: boolean) => void;

  /** Returns true when a calendar ID is not in the disabled set. */
  isCalendarEnabled: (id: string) => boolean;

  /** Returns the subset of availableCalendars that are currently enabled. */
  enabledCalendars: () => SourceCalendarMeta[];
};

type PersistedCalendarSelectionSlice = Pick<
  CalendarSelectionState,
  'availableCalendars' | 'disabledCalendarIds'
>;

export const useCalendarSelectionStore = create<CalendarSelectionState>()(
  persist(
    (set, get) => ({
      availableCalendars: [],
      disabledCalendarIds: [],

      setAvailableCalendars: (calendars) => set({ availableCalendars: calendars }),

      setCalendarEnabled: (id, enabled) => {
        // Store-level primary guard — cannot be bypassed by the UI or any caller.
        const calendar = get().availableCalendars.find(
          (c) => c.sourceCalendarId === id,
        );
        if (calendar?.sourceCalendarPrimary) return;

        set((state) => {
          if (enabled) {
            return {
              disabledCalendarIds: state.disabledCalendarIds.filter((d) => d !== id),
            };
          } else {
            if (state.disabledCalendarIds.includes(id)) return state;
            return {
              disabledCalendarIds: [...state.disabledCalendarIds, id],
            };
          }
        });
      },

      isCalendarEnabled: (id) => !get().disabledCalendarIds.includes(id),

      enabledCalendars: () => {
        const { availableCalendars, disabledCalendarIds } = get();
        const disabled = new Set(disabledCalendarIds);
        return availableCalendars.filter((c) => !disabled.has(c.sourceCalendarId));
      },
    }),
    {
      name: 'meridian-calendar-selection-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state): PersistedCalendarSelectionSlice => ({
        availableCalendars: state.availableCalendars,
        disabledCalendarIds: state.disabledCalendarIds,
      }),
    },
  ),
);
