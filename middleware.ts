/**
 * Meridian — Next.js middleware.
 *
 * Responsibilities (in order):
 *   1. Refresh Supabase auth tokens on every request so Server Components
 *      always read a valid, up-to-date session from cookies.
 *   2. Block unauthenticated access to protected routes → /signup.
 *   3. Redirect authenticated users away from /login and /signup → /.
 *
 * Security note:
 *   We use supabase.auth.getUser() — NOT getSession(). getUser() validates
 *   the JWT against Supabase's auth server on every call. getSession() only
 *   reads the cookie value without verifying it, so a tampered or replayed
 *   cookie would appear valid. Never use getSession() on the server.
 *
 * Token refresh note:
 *   Do NOT add logic between createServerClient and auth.getUser(). The
 *   refresh writes updated cookies via setAll(), which must propagate to
 *   both the incoming request object and the outgoing response.
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse }          from "next/server";

// ── Route classification ──────────────────────────────────────────────────────

/** Requires a valid session. Unauthenticated requests are redirected to /signup. */
const PROTECTED_PATHS = [
  "/",
  "/chat",
  "/life",
  "/health",
  "/money",
  "/settings",
  "/onboarding",
];

/** Auth-only routes. Authenticated users are redirected away to /. */
const AUTH_PATHS = ["/login", "/signup"];

// /auth/callback and all _next/* paths are implicitly public.

// ── Middleware ────────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          // Write refreshed tokens to the request (for Server Components)
          // and to the response (so the browser receives the updated cookie).
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Validates the JWT with Supabase's auth server. Must remain here.
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ── Guard: unauthenticated user on a protected route ───────────────────────
  const isProtected = PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  if (!user && isProtected) {
    const destination = request.nextUrl.clone();
    destination.pathname = "/signup";
    // Preserve the intended path so we can redirect back after sign-in
    destination.searchParams.set("next", pathname === "/" ? "" : pathname);
    return NextResponse.redirect(destination);
  }

  // ── Guard: authenticated user visiting /onboarding after completion ───────
  if (user && pathname === "/onboarding") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_complete")
      .eq("id", user.id)
      .single();

    if (profile?.onboarding_complete) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // ── Guard: authenticated user on an auth-only route ────────────────────────
  const isAuthRoute = AUTH_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     *   - _next/static   (static assets)
     *   - _next/image    (image optimisation)
     *   - favicon.ico
     *   - public image/svg assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
