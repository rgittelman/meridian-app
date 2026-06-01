import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'auto';

type ThemeStore = {
  /** User's explicit preference. 'auto' follows the system color scheme. */
  selectedMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
};

/**
 * Lightweight theme preference store.
 * selectedMode is the stored preference.
 * Resolved mode (light | dark) is computed in ThemeContext / useTheme.
 *
 * Future: persist selectedMode via AsyncStorage or MMKV once storage
 * infrastructure is established. The API is already ready.
 */
export const useThemeStore = create<ThemeStore>((set) => ({
  selectedMode: 'auto',
  setThemeMode: (selectedMode) => set({ selectedMode }),
}));
