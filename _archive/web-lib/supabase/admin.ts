/**
 * Supabase admin client — service role key, server-side ONLY.
 *
 * This client bypasses Row Level Security. Import it exclusively in:
 *   - Route Handlers (app/api/**)
 *   - Server Actions
 *   - Never in Client Components or any NEXT_PUBLIC_ path
 *
 * The service role key is intentionally NOT prefixed with NEXT_PUBLIC_.
 * Next.js will never expose it to the browser.
 *
 * Required env var:
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
      "Check your .env.local file.",
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken:  false,
      persistSession:    false,
    },
  });
}
