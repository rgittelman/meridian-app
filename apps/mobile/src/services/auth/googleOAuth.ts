import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';

import { logCalendarDebug } from '@/services/calendar/calendarDebug';
import {
  exchangeAuthorizationCode,
} from '@/services/auth/googleTokenClient';
import { GOOGLE_CALENDAR_SCOPE } from '@/config/google';
import {
  getActiveOAuthConfig,
  getGoogleClientIds,
  getGoogleRedirectUri,
  getOAuthRedirectMode,
  GOOGLE_DISCOVERY,
} from '@/services/auth/googleOAuthConfig';
import { mapWebBrowserResult, type GoogleOAuthPromptResult } from './oauthResult';
import type { StoredTokens } from './tokenStorage';
import { saveTokens } from './tokenStorage';

WebBrowser.maybeCompleteAuthSession();

export {
  getActiveOAuthConfig,
  getGoogleRedirectUri,
  GOOGLE_DISCOVERY,
} from '@/services/auth/googleOAuthConfig';

export async function logGoogleOAuthDebug(
  request: AuthSession.AuthRequest | null,
): Promise<void> {
  if (!__DEV__) return;

  const config = getActiveOAuthConfig();
  const scopes = [GOOGLE_CALENDAR_SCOPE, 'openid', 'profile', 'email'];

  console.log('[Google OAuth] ─── debug ───');
  console.log('[Google OAuth] redirect mode:', getOAuthRedirectMode(config));
  console.log('[Google OAuth] executionEnvironment:', Constants.executionEnvironment);
  console.log('[Google OAuth] client_id source:', config?.source ?? 'none');
  console.log('[Google OAuth] client_id:', config?.clientId ?? '(missing)');
  console.log('[Google OAuth] redirect_uri:', config?.redirectUri ?? '(missing)');
  console.log('[Google OAuth] response_type: code');
  console.log('[Google OAuth] scope:', scopes.join(' '));
  console.log('[Google OAuth] ids configured:', {
    ios: Boolean(getGoogleClientIds().ios),
    android: Boolean(getGoogleClientIds().android),
    web: Boolean(getGoogleClientIds().web),
  });

  if (!request) {
    console.log('[Google OAuth] auth request: not built');
    return;
  }

  const url = await request.makeAuthUrlAsync(GOOGLE_DISCOVERY);
  console.log('[Google OAuth] authorization URL:', url);
}

export function buildGoogleAuthRequest(): AuthSession.AuthRequest | null {
  const config = getActiveOAuthConfig();
  if (!config) return null;

  return new AuthSession.AuthRequest({
    clientId: config.clientId,
    scopes: [GOOGLE_CALENDAR_SCOPE, 'openid', 'profile', 'email'],
    redirectUri: config.redirectUri,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
    extraParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  });
}

export async function promptGoogleOAuth(
  request: AuthSession.AuthRequest,
): Promise<GoogleOAuthPromptResult> {
  const authUrl = await request.makeAuthUrlAsync(GOOGLE_DISCOVERY);
  const returnUrl = request.redirectUri;

  if (__DEV__) {
    console.log('[Google OAuth] opening session', {
      mode: getOAuthRedirectMode(getActiveOAuthConfig()),
      authUrl,
      returnUrl,
    });
  }

  const result = await WebBrowser.openAuthSessionAsync(authUrl, returnUrl, {
    preferEphemeralSession: false,
  });

  if (__DEV__) {
    console.log('[Google OAuth] session closed', {
      type: result.type,
      url: result.type === 'success' ? result.url : undefined,
    });
  }

  if (result.type === 'opened') {
    return { outcome: 'error', message: 'Auth session opened unexpectedly' };
  }

  return mapWebBrowserResult(request, result);
}

/** Exchanges code for tokens and persists to secure storage. Does not update Zustand. */
export async function exchangeCodeForTokens(
  request: AuthSession.AuthRequest,
  code: string,
): Promise<StoredTokens> {
  const tokens = await exchangeAuthorizationCode(request, code);
  await saveTokens(tokens);
  return tokens;
}

/** Persists implicit-grant tokens only. Prefer googleAuthStore.setGoogleAuthSession for in-memory state. */
export async function saveAccessTokenFromImplicitGrant(
  accessToken: string,
  options?: { refreshToken?: string | null; expiresIn?: number; scope?: string },
): Promise<StoredTokens> {
  const tokens: StoredTokens = {
    accessToken,
    refreshToken: options?.refreshToken ?? null,
    expiresAt: options?.expiresIn
      ? Date.now() + options.expiresIn * 1000
      : null,
  };
  await saveTokens(tokens);
  return tokens;
}
