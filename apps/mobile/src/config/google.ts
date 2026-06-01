import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';

export type GoogleClientIds = {
  ios: string | null;
  android: string | null;
  web: string | null;
};

export type GoogleOAuthClientSource = 'ios' | 'android' | 'web';

export type GoogleOAuthConfig = {
  clientId: string;
  redirectUri: string;
  source: GoogleOAuthClientSource;
};

/**
 * Reads Google OAuth client IDs from Expo extra (app.config.js) or EXPO_PUBLIC_* env.
 */
export function getGoogleClientIds(): GoogleClientIds {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

  const ios =
    extra.googleIosClientId ||
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
    null;

  const android =
    extra.googleAndroidClientId ||
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
    null;

  const web =
    extra.googleWebClientId ||
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
    null;

  return {
    ios: ios && ios.length > 0 ? ios : null,
    android: android && android.length > 0 ? android : null,
    web: web && web.length > 0 ? web : null,
  };
}

export const GOOGLE_CALENDAR_SCOPE =
  'https://www.googleapis.com/auth/calendar.readonly';

/** @deprecated Expo Go proxy only */
export const EXPO_AUTH_PROXY_REDIRECT_URI = 'https://auth.expo.io/@rgittelman/meridian';

/**
 * Loopback redirect allowed on Web OAuth clients (Google native-app doc).
 * Use when only EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is set on device builds.
 */
export const GOOGLE_WEB_LOOPBACK_REDIRECT_URI = 'http://127.0.0.1';

/**
 * Google iOS/Android installed-app redirect — no manual entry in Console for iOS type.
 * Derived from the platform OAuth client ID.
 */
export function googleInstalledAppRedirectUri(clientId: string): string {
  const prefix = clientId.replace('.apps.googleusercontent.com', '');
  return `com.googleusercontent.apps.${prefix}:/oauthredirect`;
}

/**
 * Picks client + redirect for the current platform.
 * iOS dev client: prefer iOS OAuth client (bundle com.meridian.app in Console).
 * Fallback: Web client + http://127.0.0.1 (add that URI in Web client settings).
 */
export function resolveGoogleOAuthConfig(): GoogleOAuthConfig | null {
  const ids = getGoogleClientIds();

  if (__DEV__ && Platform.OS === 'ios' && !ids.ios) {
    console.warn(
      '[Google OAuth] Option A: set EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID in .env, then rebuild in Xcode. ' +
        'Create an iOS OAuth client (bundle com.meridian.app) in Google Cloud Console.',
    );
  }

  if (Platform.OS === 'ios' && ids.ios) {
    return {
      clientId: ids.ios,
      redirectUri: googleInstalledAppRedirectUri(ids.ios),
      source: 'ios',
    };
  }

  if (Platform.OS === 'android' && ids.android) {
    return {
      clientId: ids.android,
      redirectUri: googleInstalledAppRedirectUri(ids.android),
      source: 'android',
    };
  }

  if (ids.web) {
    if (Platform.OS === 'web') {
      return null;
    }

    if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
      try {
        const proxy = AuthSession.getRedirectUrl();
        if (proxy.startsWith('https://auth.expo.io/')) {
          return { clientId: ids.web, redirectUri: proxy, source: 'web' };
        }
      } catch {
        // Expo Go proxy unavailable
      }
    }

    return {
      clientId: ids.web,
      redirectUri: GOOGLE_WEB_LOOPBACK_REDIRECT_URI,
      source: 'web',
    };
  }

  return null;
}

export function isGoogleOAuthConfigured(): boolean {
  return resolveGoogleOAuthConfig() !== null;
}

export function getOAuthRedirectMode(
  config: GoogleOAuthConfig | null,
): 'ios-installed' | 'android-installed' | 'web-loopback' | 'expo-proxy' | 'none' {
  if (!config) return 'none';
  if (config.redirectUri.startsWith('https://auth.expo.io')) return 'expo-proxy';
  if (config.source === 'ios') return 'ios-installed';
  if (config.source === 'android') return 'android-installed';
  return 'web-loopback';
}
