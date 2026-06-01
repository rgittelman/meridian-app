import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { useThemeContext } from './ThemeContext';
import type { AppColors } from './dark';

type NamedStyles<T> = StyleSheet.NamedStyles<T>;

/**
 * Creates a theme-reactive styles hook.
 *
 * Usage:
 *   const useStyles = makeStyles((c) => ({
 *     container: { backgroundColor: c.background },
 *     label:     { color: c.inkSecondary },
 *   }));
 *
 *   function MyComponent() {
 *     const styles = useStyles();
 *     return <View style={styles.container} />;
 *   }
 *
 * The returned hook memoizes by colors reference — styles are only
 * recomputed when the active theme changes.
 */
export function makeStyles<T extends NamedStyles<T>>(
  factory: (colors: AppColors) => T,
): () => T {
  return function useStyles(): T {
    const { colors } = useThemeContext();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}
