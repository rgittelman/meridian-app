import { useEffect, useState } from 'react';

import { useCaptureStore } from '@/store/captureStore';

/** True after AsyncStorage rehydration — avoids mock Focus stack during load */
export function useCaptureStoreHydrated(): boolean {
  const [hydrated, setHydrated] = useState(
    () => useCaptureStore.persist.hasHydrated(),
  );

  useEffect(() => {
    if (useCaptureStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return useCaptureStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  return hydrated;
}
