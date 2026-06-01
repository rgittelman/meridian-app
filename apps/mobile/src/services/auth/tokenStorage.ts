import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { logTokenStorage } from '@/services/calendar/calendarDebug';

const SECURE_ACCESS = 'meridian.google.accessToken';
const SECURE_REFRESH = 'meridian.google.refreshToken';
const SECURE_EXPIRES = 'meridian.google.expiresAt';

export type StoredTokens = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
};

async function secureSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function secureDelete(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function saveTokens(tokens: StoredTokens): Promise<void> {
  await secureSet(SECURE_ACCESS, tokens.accessToken);
  if (tokens.refreshToken) {
    await secureSet(SECURE_REFRESH, tokens.refreshToken);
  }
  if (tokens.expiresAt != null) {
    await secureSet(SECURE_EXPIRES, String(tokens.expiresAt));
  }
}

export async function loadTokens(): Promise<StoredTokens | null> {
  const accessToken = await secureGet(SECURE_ACCESS);
  if (!accessToken) return null;

  const refreshToken = await secureGet(SECURE_REFRESH);
  const expiresRaw = await secureGet(SECURE_EXPIRES);
  const expiresAt = expiresRaw ? Number(expiresRaw) : null;

  return {
    accessToken,
    refreshToken: refreshToken ?? null,
    expiresAt: Number.isFinite(expiresAt) ? expiresAt : null,
  };
}

export async function clearTokens(): Promise<void> {
  await secureDelete(SECURE_ACCESS);
  await secureDelete(SECURE_REFRESH);
  await secureDelete(SECURE_EXPIRES);
  logTokenStorage('clear', {});
}

export function isTokenExpired(expiresAt: number | null, bufferMs = 60_000): boolean {
  if (expiresAt == null) return false;
  return Date.now() >= expiresAt - bufferMs;
}
