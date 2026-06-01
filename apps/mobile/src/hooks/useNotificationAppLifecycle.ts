import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useNotificationStore } from '@/store/notificationStore';

/**
 * Records app opens for suppression (recently_opened_app) — no UI, no push.
 */
export function useNotificationAppLifecycle(): void {
  const recordAppOpen = useNotificationStore((s) => s.recordAppOpen);
  const prevState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const wasBackground =
        prevState.current === 'background' || prevState.current === 'inactive';
      if (wasBackground && next === 'active') {
        recordAppOpen();
      }
      prevState.current = next;
    });

    if (AppState.currentState === 'active') {
      recordAppOpen();
    }

    return () => sub.remove();
  }, [recordAppOpen]);
}
