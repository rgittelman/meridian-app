import { createNavigationContainerRef } from '@react-navigation/native';

import type { RootTabParamList } from '@/types/navigation';

/**
 * Module-level navigation ref — allows imperative navigation outside React
 * component trees (notification tap handler, deep links, etc.).
 *
 * Passed to NavigationContainer via the `ref` prop in RootNavigator.
 * Callers must check `.isReady()` before navigating.
 */
export const navigationRef = createNavigationContainerRef<RootTabParamList>();
