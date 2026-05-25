/**
 * lib/auth/profile-utils.ts — Profile normalization and OAuth field extraction.
 */

import type { User } from "@supabase/supabase-js";

export interface AuthProfile {
  id:                  string;
  email:               string | null;
  full_name:           string | null;
  display_name?:       string | null;
  avatar_url?:         string | null;
  onboarding_complete: boolean;
}
export interface ProfileRow {
  id?:                   string;
  email?:                string | null;
  full_name?:            string | null;
  display_name?:         string | null;
  avatar_url?:           string | null;
  onboarding_complete?:  boolean;
  [key: string]:         unknown;
}

/** Extract name/avatar from Supabase Auth user metadata (Google, Apple, etc.). */
export function extractOAuthFields(user: User): {
  full_name:    string | null;
  display_name: string | null;
  avatar_url:   string | null;
  email:        string | null;
} {
  const meta = user.user_metadata ?? {};

  const full_name =
    pick(meta, "full_name", "name", "display_name") ??
    null;

  const display_name =
    pick(meta, "display_name", "full_name", "name") ??
    null;

  const avatar_url =
    pick(meta, "avatar_url", "picture") ??
    null;

  return {
    full_name,
    display_name,
    avatar_url,
    email: user.email ?? null,
  };
}

function pick(meta: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const val = meta[key];
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  return null;
}

/** Resolve display name: full_name → display_name → email local-part. */
export function resolveProfileName(
  profile: Pick<AuthProfile, "full_name" | "display_name" | "email">,
): string | null {
  if (profile.full_name?.trim())    return profile.full_name.trim();
  if (profile.display_name?.trim()) return profile.display_name.trim();
  if (profile.email?.includes("@")) return profile.email.split("@")[0];
  return profile.email;
}

/** Normalize a DB row + auth user into a consistent AuthProfile. */
export function normalizeProfile(row: ProfileRow, user: User): AuthProfile {
  const oauth = extractOAuthFields(user);

  const full_name =
    row.full_name?.trim() ||
    row.display_name?.trim() ||
    oauth.full_name ||
    oauth.display_name ||
    null;

  const display_name =
    row.display_name?.trim() ||
    row.full_name?.trim() ||
    oauth.display_name ||
    oauth.full_name ||
    null;

  const avatar_url =
    row.avatar_url?.trim() ||
    oauth.avatar_url ||
    null;

  const email =
    row.email?.trim() ||
    oauth.email ||
    user.email ||
    null;

  return {
    id:                  row.id ?? user.id,
    email,
    full_name:           full_name ?? resolveProfileName({ full_name: null, display_name, email }),
    display_name,
    avatar_url,
    onboarding_complete: row.onboarding_complete ?? false,
  };
}

/** Convenience: first name for greetings. */
export function getProfileFirstName(profile: AuthProfile | null): string {
  if (!profile) return "there";
  const name = resolveProfileName(profile);
  return name?.split(" ")[0] ?? "there";
}

/** Build upsert payload for syncing OAuth fields into profiles. */
export function buildProfileSyncPayload(user: User): Record<string, string | null> {
  const oauth = extractOAuthFields(user);
  return {
    email:        oauth.email,
    full_name:    oauth.full_name,
    display_name: oauth.display_name,
    avatar_url:   oauth.avatar_url,
  };
}
