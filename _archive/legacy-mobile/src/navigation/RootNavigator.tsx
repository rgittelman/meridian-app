import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

import { TabNavigator } from '@/navigation/TabNavigator';
import { colors } from '@/theme';

const meridianTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.background,
    card: colors.surface,
    text: colors.ink,
    border: colors.border,
    notification: colors.accent,
  },
};

export function RootNavigator() {
  return (
    <NavigationContainer theme={meridianTheme}>
      <View style={styles.root}>
        <StatusBar style="light" />
        <TabNavigator />
      </View>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
