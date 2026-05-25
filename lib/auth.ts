/**
 * lib/auth.ts — Server-side auth utilities.
 */

import { redirect }    from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { User }   from "@supabase/supabase-js";
import { normalizeProfile, resolveProfileName, type ProfileRow, type AuthProfile } from "./auth/profile-utils";

export type { AuthProfile } from "./auth/profile-utils";
export { resolveProfileName, getProfileFirstName } from "./auth/profile-utils";

export async function getAuthUser(): Promise<User | null> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      if (!error.message.includes("session")) {
        console.error("[auth] getUser error:", error.message);
      }
      return null;
    }
    return user;
  } catch (err) {
    console.error("[auth] getUser exception:", err);
    return null;
  }
}

/**
 * Fetches the user's profile. Resilient to missing optional columns.
 * Uses select('*') then normalizes with OAuth metadata fallbacks.
 */
export async function getProfile(): Promise<AuthProfile | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      if (error.code !== "PGRST116") {
        console.error("[auth] getProfile error:", error.message);
      }
      // No row — synthesize minimal profile from auth user so app doesn't break
      return normalizeProfile({ id: user.id, onboarding_complete: false }, user);
    }

    return normalizeProfile(data as ProfileRow, user);
  } catch (err) {
    console.error("[auth] getProfile exception:", err);
    return null;
  }
}

// ── Guards ────────────────────────────────────────────────────────────────────

export async function requireAuth(redirectTo = "/signup"): Promise<User> {
  const user = await getAuthUser();
  if (!user) redirect(redirectTo);
  return user;
}

export async function requireOnboarding(): Promise<AuthProfile> {
  const profile = await getProfile();

  if (!profile) {
    redirect("/onboarding");
  }

  if (!profile.onboarding_complete) {
    redirect("/onboarding");
  }

  return profile;
}

export async function requireGuest(redirectTo = "/"): Promise<void> {
  const user = await getAuthUser();
  if (user) redirect(redirectTo);
}
