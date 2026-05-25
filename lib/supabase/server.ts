/**
 * Supabase server client — use in Server Components, Route Handlers,
 * and Server Actions. Never imported in Client Components.
 *
 * Reads and writes the auth session via HTTP-only cookies.
 * The middleware (middleware.ts) ensures the token is always fresh
 * before this client reads it — do not add logic between createServerClient
 * and auth.getUser() / auth.getClaims().
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — ignore writes here.
            // The middleware handles cookie persistence.
          }
        },
      },
    },
  );
}
