/**
 * Google Maps API key reader — Phase H.1
 *
 * Follows the same pattern as config/google.ts:
 * reads from Constants.expoConfig.extra OR EXPO_PUBLIC_* env var.
 *
 * Key security:
 *   - Never logged in full. Dev builds log presence only.
 *   - Restrict to Distance Matrix API only in Google Cloud Console.
 *   - Set a hard daily quota (recommended: 50 calls/day for household use).
 *   - Long-term: proxy through a server to remove the key from the bundle.
 */

import Constants from 'expo-constants';

import {
  GoogleDistanceMatrixProvider,
  NullEtaProvider,
  type EtaProvider,
} from '@/services/location/etaProvider';
import { isDevEnvironment } from '@/utils/isDev';

export function getGoogleMapsApiKey(): string | null {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;
  const key =
    extra['googleMapsApiKey'] ||
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    null;
  return key && key.length > 0 ? key : null;
}

/**
 * Returns a configured ETA provider.
 * Falls back to NullEtaProvider when no key is present — all leave alert
 * behavior remains identical to Phase G.2 in that case.
 */
export function buildEtaProvider(): EtaProvider {
  const key = getGoogleMapsApiKey();
  if (!key) {
    if (isDevEnvironment()) {
      console.log('[Traffic] ETA provider: null (no API key configured)');
    }
    return new NullEtaProvider();
  }
  if (isDevEnvironment()) {
    console.log('[Traffic] ETA provider: google');
  }
  return new GoogleDistanceMatrixProvider(key);
}
