/**
 * Meridian Integration Credentials — lib/integrations/config.ts
 *
 * This file defines the expected shape of all future integration credentials.
 * All values come from environment variables ONLY.
 *
 * NEVER hardcode credentials here.
 * NEVER prefix secrets with NEXT_PUBLIC_ — that exposes them to the browser.
 *
 * Add these to your .env.local (development) and your hosting provider's
 * secret store (production) when wiring real integrations.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * GOOGLE CALENDAR + GOOGLE FIT
 * ─────────────────────────────────────────────────────────────────────────────
 * TODO (Phase 2): Enable Google OAuth in Supabase Dashboard → Auth → Providers
 * OR set up a custom Google OAuth app:
 *
 *   GOOGLE_CLIENT_ID=          ← from Google Cloud Console → Credentials
 *   GOOGLE_CLIENT_SECRET=      ← from Google Cloud Console (server-side only)
 *   GOOGLE_REDIRECT_URI=       ← must match Google Cloud Console exactly
 *                                 e.g. https://yourdomain.com/auth/callback
 *
 * Scopes needed:
 *   Calendar read:  https://www.googleapis.com/auth/calendar.readonly
 *   Fit read:       https://www.googleapis.com/auth/fitness.activity.read
 *                   https://www.googleapis.com/auth/fitness.sleep.read
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PLAID (Financial Awareness)
 * ─────────────────────────────────────────────────────────────────────────────
 * TODO (Phase 4): Sign up at https://dashboard.plaid.com
 *   Start with Sandbox environment — no real bank data, free to test.
 *   Production requires Plaid approval.
 *
 *   PLAID_CLIENT_ID=   ← from Plaid dashboard
 *   PLAID_SECRET=      ← from Plaid dashboard (server-side only, env-specific)
 *   PLAID_ENV=         ← "sandbox" | "development" | "production"
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * APPLE CALENDAR + APPLE HEALTH (Sign in with Apple)
 * ─────────────────────────────────────────────────────────────────────────────
 * TODO (Phase 3): Requires Apple Developer account.
 *   Apple Health on iOS requires native HealthKit — not available in a web PWA.
 *   Apple Calendar uses CalDAV or Sign in with Apple + CloudKit JS.
 *
 *   APPLE_CLIENT_ID=    ← Services ID from Apple Developer Console
 *   APPLE_TEAM_ID=      ← 10-character Team ID from Apple Developer account
 *   APPLE_KEY_ID=       ← Key ID from the Auth Key you create
 *   APPLE_PRIVATE_KEY=  ← Contents of the .p8 private key (server-side only)
 *                          Store as a single-line string with \n for line breaks
 */

// ─── Type definitions ─────────────────────────────────────────────────────────

export interface GoogleConfig {
  clientId:    string | undefined;
  redirectUri: string | undefined;
  // clientSecret intentionally excluded — server-side only, never exported
}

export interface PlaidConfig {
  clientId: string | undefined;
  env:      string;
  // secret intentionally excluded — server-side only, never exported
}

export interface AppleConfig {
  clientId: string | undefined;
  teamId:   string | undefined;
  keyId:    string | undefined;
  // privateKey intentionally excluded — server-side only, never exported
}

export interface IntegrationConfig {
  google: GoogleConfig;
  plaid:  PlaidConfig;
  apple:  AppleConfig;
}

// ─── Config ───────────────────────────────────────────────────────────────────
// Safe for client-side import — only public identifiers are included.
// Server-side secrets are accessed directly in API routes / Server Actions.

export const INTEGRATION_CONFIG: IntegrationConfig = {
  google: {
    clientId:    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    redirectUri: process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI,
  },
  plaid: {
    clientId: process.env.NEXT_PUBLIC_PLAID_CLIENT_ID,
    env:      process.env.PLAID_ENV ?? "sandbox",
  },
  apple: {
    clientId: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID,
    teamId:   process.env.NEXT_PUBLIC_APPLE_TEAM_ID,
    keyId:    process.env.NEXT_PUBLIC_APPLE_KEY_ID,
  },
};

// ─── Server-only secrets (import only in API routes / Server Actions) ─────────
// These are NOT exported from this file to prevent accidental client inclusion.
// Access them directly with process.env inside server-side code:
//
//   process.env.GOOGLE_CLIENT_SECRET
//   process.env.PLAID_SECRET
//   process.env.APPLE_PRIVATE_KEY

/** Returns true if Google Calendar integration credentials are configured */
export function isGoogleConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID &&
    process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI &&
    process.env.GOOGLE_CLIENT_SECRET
  );
}

/** Returns true if Plaid credentials are configured */
export function isPlaidConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_PLAID_CLIENT_ID &&
    process.env.PLAID_SECRET
  );
}

/** Returns true if Apple credentials are configured */
export function isAppleConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_APPLE_CLIENT_ID &&
    process.env.APPLE_PRIVATE_KEY
  );
}
