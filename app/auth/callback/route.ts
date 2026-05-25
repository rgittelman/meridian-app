/**
 * /auth/callback — OAuth + magic link code exchange.
 *
 * Supabase redirects here after Google / Apple OAuth or email confirmation.
 * This route:
 *   1. Exchanges the one-time `code` for a persistent session cookie.
 *   2. Checks onboarding_complete to route new vs. returning users correctly.
 *
 * Redirect logic:
 *   - Exchange failure          → /login?error=auth_callback_failed
 *   - New user / no profile     → /onboarding  (profile trigger may not have fired yet)
 *   - onboarding_complete false → /onboarding
 *   - Returning user            → `next` param (default: /)
 *
 * Security:
 *   We call supabase.auth.getUser() after the exchange — not getSession() —
 *   so the user object is validated against Supabase's auth server before we
 *   query the database.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    console.error("[auth/callback] Missing code parameter");
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("[auth/callback] exchangeCodeForSession error:", exchangeError.message);
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  // Session is now valid — verify the user identity server-side
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("[auth/callback] getUser error after exchange:", userError?.message);
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  // Sync OAuth name/avatar into profiles (Google: name, picture)
  const { syncProfileFromAuth } = await import("@/lib/auth/sync-profile");
  await syncProfileFromAuth(user);

  // Check onboarding status to route new vs. returning users
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("onboarding_complete")
    .eq("id", user.id)
    .single();

  if (profileError && profileError.code !== "PGRST116") {
    // Log unexpected DB errors but don't block the user — send to onboarding
    console.error("[auth/callback] profile query error:", profileError.message);
  }

  // No profile row yet (trigger delay) or onboarding not complete → onboard
  if (!profile || !profile.onboarding_complete) {
    return NextResponse.redirect(`${origin}/onboarding`);
  }

  // Returning, onboarded user — go to their intended destination or Today
  const destination = next.startsWith("/") ? next : "/";
  return NextResponse.redirect(`${origin}${destination}`);
}
