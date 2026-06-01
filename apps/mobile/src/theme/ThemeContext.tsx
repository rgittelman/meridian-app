import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { darkColors, type AppColors } from './dark';
import { lightColors } from './light';
import { useThemeStore, type ThemeMode } from '@/store/themeStore';

type ThemeContextValue = {
  /** Active color palette — light or dark based on resolvedMode */
  colors: AppColors;
  /** User's stored preference ('auto' follows system) */
  selectedMode: ThemeMode;
  /** The computed mode after applying 'auto' resolution */
  resolvedMode: 'light' | 'dark';
  isDark: boolean;
  isLight: boolean;
  setThemeMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  colors: darkColors,
  selectedMode: 'auto',
  resolvedMode: 'dark',
  isDark: true,
  isLight: false,
  setThemeMode: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const { selectedMode, setThemeMode } = useThemeStore();

  const resolvedMode: 'light' | 'dark' =
    selectedMode === 'auto' ? (systemScheme === 'light' ? 'light' : 'dark') : selectedMode;

  const isDark = resolvedMode === 'dark';
  const colors = isDark ? darkColors : lightColors;

  const value = useMemo<ThemeContextValue>(
    () => ({ colors, selectedMode, resolvedMode, isDark, isLight: !isDark, setThemeMode }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colors, selectedMode, resolvedMode, isDark],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Internal hook — prefer useTheme() from @/hooks/useTheme for public use. */
export function useThemeContext(): ThemeContextValue {
  return useContext(ThemeContext);
}
