import { useThemeContext } from '@/theme/ThemeContext';

/**
 * Primary theme hook for all Meridian components.
 *
 * Returns:
 *   colors        — active AppColors palette (light or dark)
 *   selectedMode  — user's stored preference: 'light' | 'dark' | 'auto'
 *   resolvedMode  — computed effective mode: 'light' | 'dark'
 *   isDark        — boolean shorthand
 *   isLight       — boolean shorthand
 *   setThemeMode  — updates selectedMode in the store
 *
 * Usage:
 *   const { colors, isDark } = useTheme();
 */
export function useTheme() {
  return useThemeContext();
}
