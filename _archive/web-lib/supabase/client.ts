/**
 * Supabase browser client — use in Client Components only.
 *
 * createBrowserClient uses a singleton pattern internally, so calling this
 * multiple times across the component tree is safe and performant.
 *
 * Required env vars (set in .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
