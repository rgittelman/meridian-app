import {
  getGoogleClientIds,
  resolveGoogleOAuthConfig,
  type GoogleOAuthConfig,
} from '@/config/google';

export type { GoogleOAuthConfig };

export const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export function getActiveOAuthConfig(): GoogleOAuthConfig | null {
  return resolveGoogleOAuthConfig();
}

/** @deprecated Use getActiveOAuthConfig().redirectUri */
export function getGoogleRedirectUri(): string {
  return getActiveOAuthConfig()?.redirectUri ?? '';
}

export { getGoogleClientIds, getOAuthRedirectMode } from '@/config/google';
