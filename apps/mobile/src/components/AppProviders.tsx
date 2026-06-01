import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Text } from '@/components/typography/Text';
import { ThemeProvider, makeStyles } from '@/theme';

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <ThemeProvider>{children}</ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

type AppLoadingProps = {
  message?: string;
};

export function AppLoading({ message = 'Preparing Meridian…' }: AppLoadingProps) {
  const styles = useLoadingStyles();
  return (
    <View style={styles.loading}>
      <Text variant="callout" color="inkSecondary">
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});

const useLoadingStyles = makeStyles((c) => ({
  loading: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: c.background,
    paddingHorizontal: 24,
  },
}));
