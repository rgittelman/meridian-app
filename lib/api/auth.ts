/**
 * lib/api/auth.ts — Auth helper for API route handlers.
 *
 * Validates the session server-side and returns the user ID.
 * Returns a 401 Response if unauthenticated — never exposes internal errors.
 */

import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export type AuthResult =
  | { user: User; error: null }
  | { user: null; error: Response };

/** Require authentication in an API route. Returns user or a 401 Response. */
export async function requireApiAuth(): Promise<AuthResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        user:  null,
        error: Response.json({ error: "Unauthorized" }, { status: 401 }),
      };
    }

    return { user, error: null };
  } catch {
    return {
      user:  null,
      error: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
}

/** Safe error response — never exposes internal details to the client. */
export function apiError(message = "Something went wrong", status = 500): Response {
  console.error(`[api] ${status}: ${message}`);
  return Response.json({ error: message }, { status });
}
