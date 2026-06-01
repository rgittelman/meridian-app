import { create } from 'zustand';

type AppState = {
  /** App shell ready (fonts, navigation mounted) */
  isReady: boolean;
  setReady: (ready: boolean) => void;
};

export const useAppStore = create<AppState>((set) => ({
  isReady: false,
  setReady: (ready) => set({ isReady: ready }),
}));
