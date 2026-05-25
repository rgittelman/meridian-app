"use client";

/**
 * lib/hooks/use-auth.ts — Client-side auth state hook.
 *
 * Provides real-time auth state for Client Components with a `loading` phase
 * that prevents protected content from flashing before the session is resolved.
 *
 * Primary route protection is handled by middleware (middleware.ts).
 * This hook is a secondary, client-side defense for "use client" pages
 * like /chat and /settings that need to:
 *   1. Show a loading state while the session hydrates from cookies.
 *   2. React to live auth changes (logout in another tab, token expiry).
 *   3. Optionally redirect unauthenticated users without a server round-trip.
 *
 * Usage:
 *
 *   // Basic — just get user state
 *   const { user, loading } = useAuth();
 *
 *   // Required — redirect to /signup if no session after hydration
 *   const { user, loading } = useAuth({ required: true });
 *
 *   // Custom redirect
 *   const { user, loading } = useAuth({ required: true, redirectTo: "/login" });
 */

import { useState, useEffect } from "react";
import { useRouter }           from "next/navigation";
import { createClient }        from "@/lib/supabase/client";
import type { User }           from "@supabase/supabase-js";

interface UseAuthOptions {
  /** Redirect unauthenticated users after session hydration. Default: false. */
  required?:    boolean;
  /** Where to redirect if required and no session. Default: "/signup". */
  redirectTo?:  string;
}

export interface UseAuthResult {
  user:    User | null;
  loading: boolean;
}

export function useAuth({
  required   = false,
  redirectTo = "/signup",
}: UseAuthOptions = {}): UseAuthResult {
  const router  = useRouter();
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Hydrate from existing session cookie on mount
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      setUser(currentUser);
      setLoading(false);
      if (!currentUser && required) {
        router.replace(redirectTo);
      }
    });

    // React to auth events: SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const nextUser = session?.user ?? null;
        setUser(nextUser);
        if (!nextUser && required) {
          router.replace(redirectTo);
        }
      },
    );

    return () => subscription.unsubscribe();
  // router is stable; required/redirectTo should not change mid-render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { user, loading };
}
