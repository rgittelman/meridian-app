/**
 * POST /api/account/delete — Permanently delete the authenticated user's account.
 *
 * Uses the service role admin client to delete the user from Supabase Auth.
 * RLS cascade rules handle data cleanup for profiles, memories, etc.
 */

import { requireApiAuth, apiError } from "@/lib/api/auth";
import { safeHandler } from "@/lib/api/safe-handler";
import { createAdminClient } from "@/lib/supabase/admin";

export const POST = safeHandler(async function POST() {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const admin = createAdminClient();

  const { error } = await admin.auth.admin.deleteUser(auth.user.id);

  if (error) {
    console.error("[account/delete] admin error:", error.message);
    return apiError("Failed to delete account. Please try again.", 500);
  }

  return Response.json({ deleted: true });
});
