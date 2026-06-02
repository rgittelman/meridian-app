import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type NotificationSettingsState = {
  /** Master toggle — when false, no notifications are scheduled. */
  enabled: boolean;
  morningBriefEnabled: boolean;
  eveningPreviewEnabled: boolean;
  beforeEventsEnabled: boolean;
  criticalAlertsEnabled: boolean;
  /** 24-hour "HH:MM" */
  quietHoursStart: string;
  quietHoursEnd: string;

  setEnabled: (v: boolean) => void;
  setMorningBriefEnabled: (v: boolean) => void;
  setEveningPreviewEnabled: (v: boolean) => void;
  setBeforeEventsEnabled: (v: boolean) => void;
  setCriticalAlertsEnabled: (v: boolean) => void;
  setQuietHours: (start: string, end: string) => void;
};

type PersistedSettingsSlice = Pick<
  NotificationSettingsState,
  | 'enabled'
  | 'morningBriefEnabled'
  | 'eveningPreviewEnabled'
  | 'beforeEventsEnabled'
  | 'criticalAlertsEnabled'
  | 'quietHoursStart'
  | 'quietHoursEnd'
>;

export const useNotificationSettingsStore = create<NotificationSettingsState>()(
  persist(
    (set) => ({
      enabled: false,
      morningBriefEnabled: true,
      eveningPreviewEnabled: true,
      beforeEventsEnabled: true,
      criticalAlertsEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',

      setEnabled: (v) => set({ enabled: v }),
      setMorningBriefEnabled: (v) => set({ morningBriefEnabled: v }),
      setEveningPreviewEnabled: (v) => set({ eveningPreviewEnabled: v }),
      setBeforeEventsEnabled: (v) => set({ beforeEventsEnabled: v }),
      setCriticalAlertsEnabled: (v) => set({ criticalAlertsEnabled: v }),
      setQuietHours: (start, end) => set({ quietHoursStart: start, quietHoursEnd: end }),
    }),
    {
      name: 'meridian-notification-settings-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state): PersistedSettingsSlice => ({
        enabled: state.enabled,
        morningBriefEnabled: state.morningBriefEnabled,
        eveningPreviewEnabled: state.eveningPreviewEnabled,
        beforeEventsEnabled: state.beforeEventsEnabled,
        criticalAlertsEnabled: state.criticalAlertsEnabled,
        quietHoursStart: state.quietHoursStart,
        quietHoursEnd: state.quietHoursEnd,
      }),
    },
  ),
);
