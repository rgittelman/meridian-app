import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

import { logCalendarDebug } from '@/services/calendar/calendarDebug';
import {
  exchangeAuthorizationCode,
} from '@/services/auth/googleTokenClient';
import { GOOGLE_CALENDAR_SCOPE, getGoogleClientIds } from '@/config/google';
import {
  getActiveOAuthConfig,
  getGoogleRedirectUri,
  getOAuthRedirectMode,
  GOOGLE_DISCOVERY,
} from '@/services/auth/googleOAuthConfig';
import { mapWebBrowserResult, type GoogleOAuthPromptResult } from './oauthResult';
import type { StoredTokens } from './tokenStorage';
import { saveTokens } from './tokenStorage';

WebBrowser.maybeCompleteAuthSession();

// Configure native Google Sign-In for Android at module load time.
// Android uses the native SDK; iOS/web use expo-auth-session.
// v16: androidClientId is resolved from google-services.json automatically.
// webClientId is used for token validation/offline access; scopes declared here.
if (Platform.OS === 'android') {
  const { web: webClientId } = getGoogleClientIds();
  GoogleSignin.configure({
    webClientId: webClientId ?? undefined,
    scopes: [GOOGLE_CALENDAR_SCOPE],
    offlineAccess: false,
  });
}

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
  console.log('[Google OAuth] platform:', Platform.OS);
  console.log('[Google OAuth] android native sign-in:', Platform.OS === 'android' ? 'active' : 'n/a');
  console.log('[Google OAuth] redirect mode:', getOAuthRedirectMode(config));
  console.log('[Google OAuth] executionEnvironment:', Constants.executionEnvironment);
  console.log('[Google OAuth] client_id source:', config?.source ?? 'none');
  console.log('[Google OAuth] client_id:', config?.clientId ?? '(missing)');
  console.log('[Google OAuth] redirect_uri:', config?.redirectUri ?? '(missing)');
  console.log('[Google OAuth] scope:', scopes.join(' '));
  console.log('[Google OAuth] ids configured:', {
    ios: Boolean(getGoogleClientIds().ios),
    android: Boolean(getGoogleClientIds().android),
    web: Boolean(getGoogleClientIds().web),
  });

  if (!request) {
    console.log('[Google OAuth] auth request: not built (Android uses native sign-in)');
    return;
  }

  const url = await request.makeAuthUrlAsync(GOOGLE_DISCOVERY);
  console.log('[Google OAuth] authorization URL:', url);
}

/**
 * On Android, returns null — the native sign-in path does not use AuthRequest.
 * On iOS/web, builds a PKCE AuthRequest for the browser-based flow.
 */
export function buildGoogleAuthRequest(): AuthSession.AuthRequest | null {
  if (Platform.OS === 'android') {
    // Android uses native Google Sign-In; no AuthRequest is needed.
    return null;
  }

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

/**
 * On Android: uses native Google Sign-In SDK, ignores the AuthRequest parameter.
 * Returns { outcome: 'success', accessToken } which is handled by completeAuthWithAccessToken.
 *
 * On iOS/web: opens a browser-based OAuth session via expo-auth-session.
 */
export async function promptGoogleOAuth(
  request: AuthSession.AuthRequest | null,
): Promise<GoogleOAuthPromptResult> {
  // ── Android: native Google Sign-In ──────────────────────────────────────
  if (Platform.OS === 'android') {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      await GoogleSignin.signIn();
      const { accessToken } = await GoogleSignin.getTokens();

      if (!accessToken) {
        return { outcome: 'error', message: 'Native sign-in returned no access token' };
      }

      if (__DEV__) {
        logCalendarDebug('Android native sign-in success', {
          accessTokenLength: accessToken.length,
        });
      }

      return { outcome: 'success', accessToken, expiresIn: 3600 };
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };

      if (__DEV__) {
        logCalendarDebug('Android native sign-in error', {
          code: err.code,
          message: err.message,
        });
      }

      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        return { outcome: 'cancel' };
      }
      if (err.code === statusCodes.IN_PROGRESS) {
        return { outcome: 'locked' };
      }

      return { outcome: 'error', message: err.message ?? 'Native sign-in failed' };
    }
  }

  // ── iOS / Web: expo-auth-session browser flow ────────────────────────────
  if (!request) {
    return { outcome: 'error', message: 'No auth request configured' };
  }

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
