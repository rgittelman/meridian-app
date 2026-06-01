import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { NotificationDailyCaps } from '@/types/notification';
import { DEFAULT_NOTIFICATION_DAILY_CAPS } from '@/services/notifications/constants';

type NotificationState = {
  lastAppOpenedAt: number | null;
  recentAwarenessAt: Record<string, number>;
  ignoredPatterns: Record<string, number>;
  recoveryWindowUntil: number | null;
  dailyCaps: NotificationDailyCaps;

  recordAppOpen: () => void;
  recordAwarenessSurfaced: (bundleKey: string) => void;
  recordIgnoredPattern: (bundleKey: string) => void;
  enterRecoveryWindow: (untilMs: number) => void;
  clearRecoveryWindow: () => void;
  setDailyCaps: (caps: NotificationDailyCaps) => void;
};

type PersistedNotificationSlice = Pick<
  NotificationState,
  'lastAppOpenedAt' | 'recentAwarenessAt' | 'ignoredPatterns' | 'dailyCaps'
>;

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      lastAppOpenedAt: null,
      recentAwarenessAt: {},
      ignoredPatterns: {},
      recoveryWindowUntil: null,
      dailyCaps: DEFAULT_NOTIFICATION_DAILY_CAPS,

      recordAppOpen: () => {
        set({ lastAppOpenedAt: Date.now() });
      },

      recordAwarenessSurfaced: (bundleKey: string) => {
        set((state) => ({
          recentAwarenessAt: {
            ...state.recentAwarenessAt,
            [bundleKey]: Date.now(),
          },
        }));
      },

      recordIgnoredPattern: (bundleKey: string) => {
        set((state) => ({
          ignoredPatterns: {
            ...state.ignoredPatterns,
            [bundleKey]: Date.now(),
          },
        }));
      },

      enterRecoveryWindow: (untilMs: number) => {
        set({ recoveryWindowUntil: untilMs });
      },

      clearRecoveryWindow: () => {
        set({ recoveryWindowUntil: null });
      },

      setDailyCaps: (caps) => {
        set({ dailyCaps: caps });
      },
    }),
    {
      name: 'meridian-notification-intelligence-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state): PersistedNotificationSlice => ({
        lastAppOpenedAt: state.lastAppOpenedAt,
        recentAwarenessAt: state.recentAwarenessAt,
        ignoredPatterns: state.ignoredPatterns,
        dailyCaps: state.dailyCaps,
      }),
    },
  ),
);
