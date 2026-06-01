import { create } from 'zustand';

import type { CaptureConfirmationMessage, LifeObject } from '@/types/capture';
import { CAPTURE_CONFIRMATIONS } from '@/types/capture';
import { createLifeObject, enrichInBackground } from '@/services/capture';

type CaptureState = {
  /** Captured Life Objects — most recent first */
  items: LifeObject[];
  /** Submission in progress guard */
  isSubmitting: boolean;
  /** Active confirmation message — cleared after display */
  confirmationMessage: CaptureConfirmationMessage | null;

  /**
   * Submit raw text as a new LifeObject.
   * Synchronous: parses, creates, stores, and shows confirmation
   * without waiting for AI enrichment.
   */
  addCapture: (raw: string) => void;

  /** Called after confirmation has been shown to the user */
  clearConfirmation: () => void;

  /** Update a LifeObject — used by background AI enrichment callback */
  updateItem: (id: string, update: Partial<LifeObject>) => void;

  /** Remove an item (e.g., swipe-to-dismiss) */
  removeItem: (id: string) => void;
};

function pickConfirmation(): CaptureConfirmationMessage {
  const idx = Math.floor(Math.random() * CAPTURE_CONFIRMATIONS.length);
  return CAPTURE_CONFIRMATIONS[idx];
}

export const useCaptureStore = create<CaptureState>((set, get) => ({
  items: [],
  isSubmitting: false,
  confirmationMessage: null,

  addCapture: (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    set({ isSubmitting: true });

    const item = createLifeObject(trimmed);

    set((state) => ({
      items: [item, ...state.items],
      isSubmitting: false,
      confirmationMessage: pickConfirmation(),
    }));

    // Background AI enrichment — does nothing with stub; ready for real AI
    void enrichInBackground(item, (updated) => {
      get().updateItem(updated.id, { parse: updated.parse });
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
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    }));
  },
}));
