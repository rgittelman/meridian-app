import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { CaptureConfirmationMessage, LifeObject } from '@/types/capture';
import {
  createLifeObject,
  enrichInBackground,
  generateConfirmation,
  logCaptureIntelligenceAudit,
  auditCaptureIntelligence,
  refreshCaptureParse,
  type CaptureIntelligenceAudit,
} from '@/services/capture';
import { matchAndLinkCapture, scoreCaptureEventRelationship } from '@/services/relationships';
import { logDeferredRelink } from '@/services/calendar/calendarIntelligenceDebug';
import { useCalendarStore } from '@/store/calendarStore';
import { usePlanPromotionStore } from '@/store/planPromotionStore';
import type { MeridianCalendarEvent } from '@/types/calendar';

type SerializedLifeObject = Omit<
  LifeObject,
  'createdAt' | 'relationshipCreatedAt'
> & {
  createdAt: string;
  relationshipCreatedAt?: string | null;
};

function serializeLifeObjects(items: LifeObject[]): SerializedLifeObject[] {
  return items.map((item) => ({
    ...item,
    createdAt: item.createdAt.toISOString(),
    relationshipCreatedAt: item.relationshipCreatedAt
      ? item.relationshipCreatedAt.toISOString()
      : item.relationshipCreatedAt ?? null,
  }));
}

function deserializeLifeObjects(items: SerializedLifeObject[]): LifeObject[] {
  return items.map((item) => {
    const hydrated: LifeObject = {
      ...item,
      createdAt: new Date(item.createdAt),
      relationshipCreatedAt: item.relationshipCreatedAt
        ? new Date(item.relationshipCreatedAt)
        : null,
    };
    return refreshCaptureParse(hydrated);
  });
}

function getLinkableCalendarEvents(): MeridianCalendarEvent[] {
  const { weekEvents, upcomingEvents } = useCalendarStore.getState();
  const seen = new Set<string>();
  const merged: MeridianCalendarEvent[] = [];

  for (const e of [...weekEvents, ...upcomingEvents]) {
    if (!seen.has(e.id)) {
      seen.add(e.id);
      merged.push(e);
    }
  }
  return merged;
}

type CaptureState = {
  items: LifeObject[];
  isSubmitting: boolean;
  confirmationMessage: CaptureConfirmationMessage | null;
  /** Dev: last save audit for promotion transparency */
  lastCaptureAudit: CaptureIntelligenceAudit | null;
  /**
   * Increments on every addCapture — session only, not persisted.
   * useNotificationDelivery watches this to trigger immediate reconciliation
   * when a capture is saved (needed for capture reminder notifications).
   */
  captureVersion: number;

  addCapture: (raw: string) => void;
  clearConfirmation: () => void;
  updateItem: (id: string, update: Partial<LifeObject>) => void;
  removeItem: (id: string) => void;
  /** Re-run calendar matching after sync (offline-safe: no-op without events) */
  relinkCapturesToCalendar: () => void;
  /**
   * One-time repair: re-scores all calendar_match links under the corrected scorer
   * and clears any that are now LOW confidence. Stored/manual links are never touched.
   * Safe to run on every rehydration — idempotent for already-valid links.
   */
  repairCorruptedCalendarLinks: () => void;
};

export const useCaptureStore = create<CaptureState>()(
  persist(
    (set, get) => ({
      items: [],
      isSubmitting: false,
      confirmationMessage: null,
      lastCaptureAudit: null,
      captureVersion: 0,

      addCapture: (raw: string) => {
        const trimmed = raw.trim();
        if (!trimmed) return;

        set({ isSubmitting: true });

        let item = createLifeObject(trimmed);
        item = matchAndLinkCapture(item, getLinkableCalendarEvents());

        const audit = auditCaptureIntelligence(item);
        logCaptureIntelligenceAudit(audit);

        set((state) => ({
          items: [item, ...state.items],
          isSubmitting: false,
          confirmationMessage: generateConfirmation(item),
          lastCaptureAudit: audit,
          captureVersion: state.captureVersion + 1,
        }));

        void enrichInBackground(item, (updated) => {
          const relinked = matchAndLinkCapture(updated, getLinkableCalendarEvents());
          get().updateItem(relinked.id, {
            parse: relinked.parse,
            ...calendarLinkPatch(relinked),
          });
        });
      },

      clearConfirmation: () => set({ confirmationMessage: null }),

      updateItem: (id, update) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...update } : item,
          ),
        }));
      },

      removeItem: (id) => {
        usePlanPromotionStore.getState().clearStatus(id);
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      },

      repairCorruptedCalendarLinks: () => {
        const events = getLinkableCalendarEvents();
        set((state) => ({
          items: state.items.map((item) => {
            if (!item.linkedCalendarEventId) return item;
            if (item.status === 'done' || item.status === 'archived') return item;
            // Never clear manually stored links.
            if (item.relationshipSource === 'stored') return item;

            const linkedEvent = events.find((e) => e.id === item.linkedCalendarEventId);
            if (!linkedEvent) return clearCalendarLink(item);

            const { confidence } = scoreCaptureEventRelationship(item, linkedEvent);
            if (confidence === 'low') return clearCalendarLink(item);
            return item;
          }),
        }));
      },

      relinkCapturesToCalendar: () => {
        const events = getLinkableCalendarEvents();
        if (events.length === 0) return;

        let matched = 0;
        set((state) => ({
          items: state.items.map((item) => {
            if (item.status === 'done' || item.status === 'archived') return item;
            if (item.relationshipConfidence === 'high' && item.linkedCalendarEventId) {
              return item;
            }
            const linked = matchAndLinkCapture(item, events);
            if (linked.linkedCalendarEventId && !item.linkedCalendarEventId) {
              matched += 1;
            }
            return linked;
          }),
        }));

        if (__DEV__) {
          logDeferredRelink(get().items.length, matched);
        }
      },
    }),
    {
      name: 'meridian-captures-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        items: serializeLifeObjects(state.items),
      }),
      merge: (persisted, current) => {
        const p = persisted as { items?: SerializedLifeObject[] } | undefined;
        const items = p?.items?.length
          ? deserializeLifeObjects(p.items)
          : current.items;

        return {
          ...current,
          items,
          isSubmitting: false,
          confirmationMessage: null,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (!state?.items.length) return;
        queueMicrotask(() => {
          const store = useCaptureStore.getState();
          store.repairCorruptedCalendarLinks();
          store.relinkCapturesToCalendar();
        });
      },
    },
  ),
);

function clearCalendarLink(item: LifeObject): LifeObject {
  return {
    ...item,
    linkedCalendarEventId: undefined,
    linkedCalendarEventTitle: undefined,
    linkedCalendarEventSourceCalendar: undefined,
    relationshipType: undefined,
    relationshipConfidence: undefined,
    relationshipReason: undefined,
    relationshipCreatedAt: null,
    relationshipSource: undefined,
  };
}

function calendarLinkPatch(item: LifeObject): Partial<LifeObject> {
  return {
    linkedCalendarEventId: item.linkedCalendarEventId,
    linkedCalendarEventTitle: item.linkedCalendarEventTitle,
    linkedCalendarEventSourceCalendar: item.linkedCalendarEventSourceCalendar,
    relationshipType: item.relationshipType,
    relationshipConfidence: item.relationshipConfidence,
    relationshipReason: item.relationshipReason,
    relationshipCreatedAt: item.relationshipCreatedAt,
    relationshipSource: item.relationshipSource,
  };
}
