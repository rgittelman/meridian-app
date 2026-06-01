/**
 * Google OAuth token HTTP client — no store imports (breaks require cycle).
 */

import type * as AuthSession from 'expo-auth-session';

import { getActiveOAuthConfig, GOOGLE_DISCOVERY } from './googleOAuthConfig';
import { logCalendarDebug } from '@/services/calendar/calendarDebug';
import type { StoredTokens } from './tokenStorage';

export async function exchangeAuthorizationCode(
  request: AuthSession.AuthRequest,
  code: string,
): Promise<StoredTokens> {
  const config = getActiveOAuthConfig();
  if (!config) throw new Error('Google OAuth not configured');

  const body = new URLSearchParams({
    code,
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    grant_type: 'authorization_code',
    code_verifier: request.codeVerifier ?? '',
  });

  const res = await fetch(GOOGLE_DISCOVERY.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const responseText = await res.text();

  if (!res.ok) {
    logCalendarDebug('token exchange failed', {
      status: res.status,
      clientSource: config.source,
      redirectUri: config.redirectUri,
      body: responseText,
    });
    throw new Error('Could not complete calendar connection');
  }

  const json = JSON.parse(responseText) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };

  if (!json.access_token) {
    logCalendarDebug('token exchange missing access_token', { body: responseText });
    throw new Error('Could not complete calendar connection');
  }

  if (__DEV__) {
    logCalendarDebug('token exchange success', {
      clientSource: config.source,
      scope: json.scope ?? '(not returned)',
      hasRefreshToken: Boolean(json.refresh_token),
      accessTokenLength: json.access_token.length,
      calendarScopeGranted: json.scope?.includes('calendar') ?? false,
    });
  }

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresAt: json.expires_in ? Date.now() + json.expires_in * 1000 : null,
  };
}

export async function refreshGoogleAccessToken(
  refreshToken: string,
): Promise<StoredTokens> {
  const config = getActiveOAuthConfig();
  if (!config) throw new Error('Google OAuth not configured');

  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: config.clientId,
    grant_type: 'refresh_token',
  });

  const res = await fetch(GOOGLE_DISCOVERY.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new Error('Calendar session expired');
  }

  const json = (await res.json()) as {
    access_token: string;
    expires_in?: number;
  };

  return {
    accessToken: json.access_token,
    refreshToken,
    expiresAt: json.expires_in ? Date.now() + json.expires_in * 1000 : null,
  };
}
