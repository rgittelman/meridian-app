/**
 * lib/auth/sync-profile.ts — Sync OAuth metadata into public.profiles.
 *
 * Called after OAuth callback and onboarding completion.
 * Never throws — logs warnings only. Never resets onboarding_complete.
 */

import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import { buildProfileSyncPayload } from "./profile-utils";

export async function syncProfileFromAuth(user: User): Promise<void> {
  try {
    const supabase = await createClient();
    const payload  = buildProfileSyncPayload(user);

    const update: Record<string, string | null> = {};
    if (payload.email)        update.email        = payload.email;
    if (payload.full_name)    update.full_name    = payload.full_name;
    if (payload.display_name) update.display_name = payload.display_name;
    if (payload.avatar_url)   update.avatar_url   = payload.avatar_url;

    if (Object.keys(update).length === 0) return;

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("profiles")
        .update({ ...update, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (error) console.warn("[auth] syncProfileFromAuth update:", error.message);
      return;
    }

    const { error } = await supabase.from("profiles").insert({
      id:                  user.id,
      ...update,
      onboarding_complete: false,
    });
    if (error) console.warn("[auth] syncProfileFromAuth insert:", error.message);
  } catch (err) {
    console.warn("[auth] syncProfileFromAuth exception:", err);
  }
}
