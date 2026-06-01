/**
 * Backward-compatible re-export.
 *
 * Components that still use `import { colors } from '@/theme'` statically
 * receive the dark palette (the default/fallback).
 *
 * For adaptive theming: use `const { colors } = useTheme()` instead.
 */
export { darkColors as colors } from './dark';
export type { AppColors, AppColors as ColorToken } from './dark';
