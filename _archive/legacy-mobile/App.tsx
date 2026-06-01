import { useEffect } from 'react';

import { AppLoading, AppProviders } from '@/components/AppProviders';
import { useAppFonts } from '@/hooks/useAppFonts';
import { RootNavigator } from '@/navigation/RootNavigator';
import { useAppStore } from '@/store/appStore';

export default function App() {
  const { loaded, error } = useAppFonts();
  const setReady = useAppStore((s) => s.setReady);

  useEffect(() => {
    if (loaded) setReady(true);
  }, [loaded, setReady]);

  return (
    <AppProviders>
      {!loaded && !error ? <AppLoading /> : <RootNavigator />}
    </AppProviders>
  );
}
