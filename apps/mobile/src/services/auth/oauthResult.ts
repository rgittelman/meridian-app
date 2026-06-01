import * as Linking from 'expo-linking';
import type * as AuthSession from 'expo-auth-session';

import { logCalendarDebug } from '@/services/calendar/calendarDebug';

export type GoogleOAuthPromptResult =
  | { outcome: 'success'; code: string }
  | { outcome: 'success'; accessToken: string; expiresIn?: number; scope?: string }
  | { outcome: 'cancel' | 'dismiss' | 'locked' }
  | { outcome: 'error'; message: string; rawUrl?: string };

function queryParamsFromUrl(url: string): Record<string, string> {
  const parsed = Linking.parse(url);
  const fromParse = parsed.queryParams ?? {};
  const flat: Record<string, string> = {};

  for (const [key, value] of Object.entries(fromParse)) {
    if (value == null) continue;
    flat[key] = Array.isArray(value) ? value[0] : String(value);
  }

  if (Object.keys(flat).length > 0) {
    return flat;
  }

  const query = url.includes('?') ? url.split('?')[1]?.split('#')[0] : '';
  const hash = url.includes('#') ? url.split('#')[1] : '';
  const params = new URLSearchParams(query || hash || '');
  return Object.fromEntries(params.entries());
}

/**
 * Parses OAuth callback URL. Tolerates Expo proxy state quirks when `code` is present.
 * Never treats id_token as Calendar API access token.
 */
export function parseGoogleOAuthCallback(
  request: AuthSession.AuthRequest,
  url: string,
): GoogleOAuthPromptResult {
  const params = queryParamsFromUrl(url);

  if (__DEV__) {
    logCalendarDebug('OAuth callback params', {
      keys: Object.keys(params),
      hasCode: Boolean(params.code),
      hasAccessToken: Boolean(params.access_token),
      hasIdToken: Boolean(params.id_token),
      error: params.error,
      stateMatch: !params.state || params.state === request.state,
    });
  }

  if (params.error) {
    return {
      outcome: 'error',
      message: params.error_description ?? params.error,
      rawUrl: url,
    };
  }

  if (params.code) {
    if (params.state && params.state !== request.state) {
      if (__DEV__) {
        console.warn(
          '[Google OAuth] state mismatch — using authorization code anyway for proxy return',
        );
      }
    }
    return { outcome: 'success', code: params.code };
  }

  if (params.access_token) {
    const expiresIn = params.expires_in ? Number(params.expires_in) : undefined;
    return {
      outcome: 'success',
      accessToken: params.access_token,
      expiresIn: Number.isFinite(expiresIn) ? expiresIn : undefined,
      scope: params.scope,
    };
  }

  if (params.id_token) {
    return {
      outcome: 'error',
      message: 'Received id_token only — Calendar API requires access_token',
      rawUrl: url,
    };
  }

  return { outcome: 'error', message: 'No authorization code or access token in callback', rawUrl: url };
}

export function mapWebBrowserResult(
  request: AuthSession.AuthRequest,
  result: AuthSession.AuthSessionResult,
): GoogleOAuthPromptResult {
  if (result.type === 'cancel' || result.type === 'dismiss' || result.type === 'locked') {
    return { outcome: result.type };
  }

  if (result.type === 'success' && result.url) {
    return parseGoogleOAuthCallback(request, result.url);
  }

  if (result.type === 'error' && result.url) {
    const parsed = parseGoogleOAuthCallback(request, result.url);
    if (parsed.outcome === 'success') {
      return parsed;
    }
  }

  const message =
    result.type === 'error'
      ? result.error?.message ?? result.params?.error ?? 'OAuth error'
      : `OAuth ${result.type}`;
  return { outcome: 'error', message };
}
