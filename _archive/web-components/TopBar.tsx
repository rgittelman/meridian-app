"use client";

/**
 * TopBar — persistent app identity bar.
 *
 * Left:  "meridian" wordmark — decorative only, not interactive.
 * Right: profile avatar chip — routes to /settings.
 *
 * Avatar priority:
 *   1. avatar_url from OAuth provider (Google / Apple)
 *   2. Initials derived from full_name
 *   3. Generic person icon fallback
 */

import Link             from "next/link";
import { usePathname }  from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const HIDDEN_ON = ["/chat", "/login", "/signup", "/onboarding", "/settings"];

interface UserMeta {
  photoUrl: string | null;
  initials: string | null;
}

export default function TopBar() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserMeta>({ photoUrl: null, initials: null });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) return;
      const meta     = u.user_metadata ?? {};
      const photoUrl =
        (meta.avatar_url as string | undefined) ??
        (meta.picture as string | undefined) ??
        null;
      const name =
        (meta.full_name as string | undefined) ??
        (meta.name as string | undefined) ??
        (meta.display_name as string | undefined) ??
        u.email ??
        "";
      const initials = name.trim().charAt(0).toUpperCase() || null;
      setUser({ photoUrl, initials });
    });
  }, []);

  if (HIDDEN_ON.includes(pathname)) return null;

  return (
    <div
      style={{
        position:             "fixed",
        top:                  0,
        left:                 0,
        right:                0,
        zIndex:               40,
        height:               52,
        display:              "flex",
        alignItems:           "center",
        justifyContent:       "space-between",
        padding:              "0 20px",
        background:           "rgba(247,246,250,0.88)",
        backdropFilter:       "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        borderBottom:         "1px solid rgba(108,105,224,0.06)",
      }}
    >
      {/* Wordmark — identity only, not interactive */}
      <span
        style={{
          fontSize:      12,
          fontWeight:    400,
          letterSpacing: "0.14em",
          color:         "#C4C2D4",
          userSelect:    "none",
          pointerEvents: "none",
        }}
      >
        meridian
      </span>

      {/* Avatar — only tappable element */}
      <Link href="/settings" aria-label="Profile and settings" style={{ textDecoration: "none", display: "flex" }}>
        <AvatarChip user={user} />
      </Link>
    </div>
  );
}

// ─── Avatar chip ──────────────────────────────────────────────────────────────

interface UserMeta {
  photoUrl: string | null;
  initials: string | null;
}

function AvatarChip({ user }: { user: UserMeta }) {
  // 1 — Real profile photo from OAuth
  if (user.photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.photoUrl}
        alt="Profile"
        width={30}
        height={30}
        style={{
          width:        30,
          height:       30,
          borderRadius: "50%",
          objectFit:    "cover",
          display:      "block",
          border:       "1.5px solid rgba(108,105,224,0.20)",
        }}
      />
    );
  }

  // 2 — Initials chip (name known, no photo)
  if (user.initials) {
    return (
      <div
        style={{
          width:          30,
          height:         30,
          borderRadius:   "50%",
          background:     "rgba(108,105,224,0.14)",
          border:         "1.5px solid rgba(108,105,224,0.22)",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize:      12,
            fontWeight:    600,
            color:         "#6C69E0",
            letterSpacing: "-0.01em",
            lineHeight:    1,
          }}
        >
          {user.initials}
        </span>
      </div>
    );
  }

  // 3 — Fallback person icon (pre-auth default)
  return (
    <div
      style={{
        width:          30,
        height:         30,
        borderRadius:   "50%",
        background:     "rgba(108,105,224,0.10)",
        border:         "1.5px solid rgba(108,105,224,0.16)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
      }}
    >
      <svg
        width="14" height="14" viewBox="0 0 24 24"
        fill="none" stroke="#6C69E0"
        strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
        style={{ opacity: 0.70 }}
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </div>
  );
}
