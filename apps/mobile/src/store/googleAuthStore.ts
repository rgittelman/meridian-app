import { create } from 'zustand';

import { logCalendarDebug } from '@/services/calendar/calendarDebug';
import {
  clearTokens,
  isTokenExpired,
  loadTokens,
  saveTokens,
  type StoredTokens,
} from '@/services/auth/tokenStorage';
import { refreshGoogleAccessToken } from '@/services/auth/googleTokenClient';

export type GoogleAuthSession = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
};

type GoogleAuthState = {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  authError: string | null;
  /** From Google profile when available — used for greeting, etc. */
  userDisplayName: string | null;

  hydrateFromStorage: () => Promise<void>;
  setGoogleAuthSession: (session: GoogleAuthSession) => Promise<void>;
  setUserDisplayName: (name: string | null) => void;
  clearAuth: () => Promise<void>;
  /** Valid access token for Calendar API (never id_token). Refreshes when expired. */
  getAccessToken: () => Promise<string | null>;
};

export const useGoogleAuthStore = create<GoogleAuthState>((set, get) => ({
  isAuthenticated: false,
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  authError: null,
  userDisplayName: null,

  setUserDisplayName: (name) => set({ userDisplayName: name }),

  hydrateFromStorage: async () => {
    const stored = await loadTokens();
    if (!stored) {
      set({
        isAuthenticated: false,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
      });
      return;
    }

    set({
      isAuthenticated: true,
      accessToken: stored.accessToken,
      refreshToken: stored.refreshToken,
      expiresAt: stored.expiresAt,
      authError: null,
    });

    if (__DEV__) {
      logCalendarDebug('auth store hydrated', {
        hasAccessToken: Boolean(stored.accessToken),
        hasRefreshToken: Boolean(stored.refreshToken),
        expiresAt: stored.expiresAt,
        expired: isTokenExpired(stored.expiresAt),
      });
    }
  },

  setGoogleAuthSession: async (session) => {
    if (!session.accessToken?.trim()) {
      throw new Error('Cannot set session without access token');
    }

    const tokens: StoredTokens = {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt,
    };

    await saveTokens(tokens);

    set({
      isAuthenticated: true,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt,
      authError: null,
    });

    if (__DEV__) {
      logCalendarDebug('auth session set', {
        accessTokenLength: session.accessToken.length,
        hasRefreshToken: Boolean(session.refreshToken),
        expiresAt: session.expiresAt,
      });
    }
  },

  clearAuth: async () => {
    await clearTokens();
    set({
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      authError: null,
      userDisplayName: null,
    });
  },

  getAccessToken: async () => {
    const state = get();
    let accessToken = state.accessToken;
    let refreshToken = state.refreshToken;
    let expiresAt = state.expiresAt;

    if (!accessToken) {
      const stored = await loadTokens();
      if (!stored) {
        return null;
      }
      accessToken = stored.accessToken;
      refreshToken = stored.refreshToken;
      expiresAt = stored.expiresAt;
      set({
        isAuthenticated: true,
        accessToken,
        refreshToken,
        expiresAt,
      });
    }

    if (!isTokenExpired(expiresAt)) {
      return accessToken;
    }

    if (!refreshToken) {
      await get().clearAuth();
      return null;
    }

    try {
      const refreshed = await refreshGoogleAccessToken(refreshToken);
      await get().setGoogleAuthSession({
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        expiresAt: refreshed.expiresAt,
      });
      return refreshed.accessToken;
    } catch (err) {
      if (__DEV__) {
        logCalendarDebug('auth refresh failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
      set({ authError: 'token_expired' });
      await get().clearAuth();
      return null;
    }
  },
}));
