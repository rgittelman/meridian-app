/**
 * Meridian — notification delivery store
 *
 * Persists scheduled notification records and the current OS permission state.
 *
 * Design:
 * - `records` is the source of truth for what Meridian has scheduled.
 *   The OS scheduler strips content metadata, so we never read from it —
 *   we read from this store and use platformNotificationId to cancel via OS APIs.
 * - `permissionState` is cached here so components can read it without
 *   an async OS call. Updated whenever permissions are checked or requested.
 * - Not reactive to app lifecycle — callers update it explicitly.
 *
 * Storage key is separate from the intelligence store to allow independent
 * migrations and to prevent a delivery record corruption from affecting
 * intelligence suppression state.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type {
  NotificationPermissionState,
  ScheduledNotificationCancellationReason,
  ScheduledNotificationRecord,
  ScheduledNotificationStatus,
} from '@/types/notificationDelivery';
import { NOTIFICATION_DELIVERY_STORAGE_KEY } from '@/services/notifications/delivery/constants';

// ── Serialization helpers ─────────────────────────────────────────────────────
// ScheduledNotificationRecord has Date fields that AsyncStorage cannot persist
// natively. Serialize them to ISO strings on the way out and restore on the way in.

type SerializedRecord = Omit<
  ScheduledNotificationRecord,
  'scheduledFor' | 'targetWindowStart' | 'targetWindowEnd' | 'createdAt' | 'updatedAt'
> & {
  scheduledFor: string;
  targetWindowStart: string;
  targetWindowEnd: string;
  createdAt: string;
  updatedAt: string;
};

function serializeRecord(r: ScheduledNotificationRecord): SerializedRecord {
  return {
    ...r,
    scheduledFor: r.scheduledFor.toISOString(),
    targetWindowStart: r.targetWindowStart.toISOString(),
    targetWindowEnd: r.targetWindowEnd.toISOString(),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

function deserializeRecord(r: SerializedRecord): ScheduledNotificationRecord {
  return {
    ...r,
    scheduledFor: new Date(r.scheduledFor),
    targetWindowStart: new Date(r.targetWindowStart),
    targetWindowEnd: new Date(r.targetWindowEnd),
    createdAt: new Date(r.createdAt),
    updatedAt: new Date(r.updatedAt),
  };
}

// ── Persisted shape ───────────────────────────────────────────────────────────

type PersistedDeliverySlice = {
  records: SerializedRecord[];
  permissionState: NotificationPermissionState;
};

// ── Store state ───────────────────────────────────────────────────────────────

type NotificationDeliveryState = {
  /** Live records — Dates are native Date objects in memory. */
  records: ScheduledNotificationRecord[];
  /** Cached OS permission state — updated explicitly, never auto-refreshed. */
  permissionState: NotificationPermissionState;

  /** Insert or replace a record by id. */
  upsertRecord: (record: ScheduledNotificationRecord) => void;
  /** Partial update a record by id. */
  updateRecord: (id: string, patch: Partial<ScheduledNotificationRecord>) => void;
  /** Remove a single record. */
  removeRecord: (id: string) => void;
  /** Clear all records (e.g. on full cancel). */
  clearAllRecords: () => void;
  /** Cache the current OS permission state. */
  setPermissionState: (state: NotificationPermissionState) => void;
  /** Convenience: mark a record's deliveryStatus without a full patch call. */
  markRecordStatus: (
    id: string,
    status: ScheduledNotificationStatus,
    cancellationReason?: ScheduledNotificationCancellationReason,
  ) => void;
};

// ── Store ─────────────────────────────────────────────────────────────────────

export const useNotificationDeliveryStore = create<NotificationDeliveryState>()(
  persist(
    (set, get) => ({
      records: [],
      permissionState: 'unknown',

      upsertRecord: (record) => {
        set((state) => {
          const existing = state.records.findIndex((r) => r.id === record.id);
          if (existing >= 0) {
            const next = [...state.records];
            next[existing] = record;
            return { records: next };
          }
          return { records: [...state.records, record] };
        });
      },

      updateRecord: (id, patch) => {
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id ? { ...r, ...patch, updatedAt: new Date() } : r,
          ),
        }));
      },

      removeRecord: (id) => {
        set((state) => ({
          records: state.records.filter((r) => r.id !== id),
        }));
      },

      clearAllRecords: () => {
        set({ records: [] });
      },

      setPermissionState: (state) => {
        set({ permissionState: state });
      },

      markRecordStatus: (id, status, cancellationReason) => {
        const now = new Date();
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id
              ? {
                  ...r,
                  deliveryStatus: status,
                  cancellationReason: cancellationReason ?? r.cancellationReason,
                  updatedAt: now,
                }
              : r,
          ),
        }));
      },
    }),
    {
      name: NOTIFICATION_DELIVERY_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      // Serialize Date fields to strings before writing, restore on hydration.
      partialize: (state): PersistedDeliverySlice => ({
        records: state.records.map(serializeRecord),
        permissionState: state.permissionState,
      }),
      merge: (persisted, current) => {
        const p = persisted as PersistedDeliverySlice | undefined;
        return {
          ...current,
          permissionState: p?.permissionState ?? 'unknown',
          records: (p?.records ?? []).map(deserializeRecord),
        };
      },
    },
  ),
);
