/**
 * Token access via auth store — isolated to avoid googleOAuth ↔ store cycle.
 */

import { useGoogleAuthStore } from '@/store/googleAuthStore';

export async function getValidAccessToken(): Promise<string | null> {
  return useGoogleAuthStore.getState().getAccessToken();
}

export async function disconnectGoogle(): Promise<void> {
  await useGoogleAuthStore.getState().clearAuth();
}
