"use client";

/**
 * /settings — Meridian account, connections, memory, and privacy.
 *
 * Reads the active Supabase session on mount. Falls back gracefully
 * to placeholder values if no session exists (dev / pre-auth).
 */

import { useState, useEffect }   from "react";
import { useRouter }             from "next/navigation";
import ConnectionCard            from "@/components/ConnectionCard";
import MemoryCenter                from "@/components/MemoryCenter";
import MemoryDevPanel              from "@/components/MemoryDevPanel";
import SettingsSection, { SettingsRow } from "@/components/SettingsSection";
import { CONNECTIONS }           from "@/data/connections";
import { createClient }          from "@/lib/supabase/client";
import { useAuth }               from "@/lib/hooks/use-auth";
import { useBuildInfo }          from "@/components/BuildUpdateChecker";

export default function SettingsPage() {
  const router   = useRouter();
  const supabase = createClient();

  // Client-side auth guard — middleware is primary, this prevents content flash
  const { user, loading: authLoading } = useAuth({ required: true });

  const [userEmail,    setUserEmail]    = useState<string>("—");
  const [signInMethod, setSignInMethod] = useState<string>("—");
  const [deleteStep,   setDeleteStep]   = useState<0 | 1 | 2>(0);
  const [deleting,     setDeleting]     = useState(false);
  const [lastUpdateCheck, setLastUpdateCheck] = useState<string | null>(null);
  const [checking,     setChecking]     = useState(false);
  const build = useBuildInfo();

  // Populate account info once auth is resolved
  useEffect(() => {
    if (!user) return;
    setUserEmail(user.email ?? "—");
    const providers = (user.identities ?? []).map((i) => i.provider);
    if (providers.includes("google"))     setSignInMethod("Google");
    else if (providers.includes("apple")) setSignInMethod("Apple");
    else if (providers.includes("email")) setSignInMethod("Email");
    else                                  setSignInMethod(providers[0] ?? "—");
  }, [user]);

  // Hold render until session is confirmed — prevents flash of settings content
  if (authLoading) return null;

  return (
    <div style={{ minHeight: "100dvh", background: "#F7F6FA" }}>

      {/* ── Fixed header ─────────────────────────────────────────────── */}
      <div
        style={{
          position:              "fixed",
          top:                   0,
          left:                  0,
          right:                 0,
          zIndex:                50,
          height:                56,
          background:            "rgba(247,246,250,0.94)",
          backdropFilter:        "blur(20px)",
          WebkitBackdropFilter:  "blur(20px)",
          borderBottom:          "1px solid rgba(0,0,0,0.05)",
          display:               "flex",
          alignItems:            "center",
          padding:               "0 20px",
          maxWidth:              "100%",
        }}
      >
        {/* Back button */}
        <button
          onClick={() => router.back()}
          style={{
            display:    "flex",
            alignItems: "center",
            gap:        4,
            background: "none",
            border:     "none",
            cursor:     "pointer",
            color:      "#6C69E0",
            fontSize:   14,
            fontWeight: 500,
            padding:    0,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>

        {/* Title */}
        <p
          style={{
            position:      "absolute",
            left:          "50%",
            transform:     "translateX(-50%)",
            fontSize:      15,
            fontWeight:    600,
            color:         "#1C1A2E",
            letterSpacing: "-0.01em",
          }}
        >
          Settings
        </p>
      </div>

      {/* ── Scrollable content ───────────────────────────────────────── */}
      <div
        style={{
          paddingTop:    72,
          paddingBottom: 40,
          paddingLeft:   20,
          paddingRight:  20,
          maxWidth:      480,
          margin:        "0 auto",
        }}
      >

        {/* ── Account ──────────────────────────────────────────────── */}
        <SettingsSection title="Account">
          <SettingsRow
            label="Email"
            value={userEmail}
            border
          />
          <SettingsRow
            label="Sign-in method"
            value={signInMethod}
            action={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C4C2D4" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            }
            border
          />
          <SettingsRow
            label="Manage account"
            action={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C4C2D4" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            }
            border
          />
          <SettingsRow
            label="Sign out"
            action={
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  // Full page reload ensures all server-side session cookies
                  // are cleared before the new route is rendered. Using
                  // router.push() alone can serve a stale cached page.
                  window.location.href = "/signup";
                }}
                style={{
                  fontSize:      12,
                  fontWeight:    600,
                  color:         "#9E9CB0",
                  background:    "rgba(0,0,0,0.04)",
                  border:        "1px solid rgba(0,0,0,0.06)",
                  borderRadius:  20,
                  padding:       "5px 14px",
                  cursor:        "pointer",
                  whiteSpace:    "nowrap",
                }}
              >
                Sign out
              </button>
            }
            border={false}
          />
        </SettingsSection>

        {/* ── Connections ───────────────────────────────────────────── */}
        <section style={{ marginBottom: 32 }}>
          <p
            style={{
              fontSize:      11,
              fontWeight:    600,
              color:         "#B0AEC4",
              letterSpacing: "0.09em",
              marginBottom:  10,
              paddingLeft:   2,
            }}
          >
            CONNECTIONS
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {CONNECTIONS.map((conn) => (
              <ConnectionCard key={conn.id} connection={conn} />
            ))}
          </div>
        </section>

        {/* ── Meridian Memory ──────────────────────────────────────── */}
        <MemoryCenter />

        {/* ── Dev tools (development only) ───────────────────────── */}
        <MemoryDevPanel />

        {/* ── Privacy ──────────────────────────────────────────────── */}
        <SettingsSection title="Privacy">
          <SettingsRow
            label="Data sources"
            value="Coming soon"
            action={
              <span style={{ fontSize: 11, color: "#C4C2D4", fontWeight: 500 }}>Coming soon</span>
            }
            border
          />
          <SettingsRow
            label="Permissions"
            value="Coming soon"
            action={
              <span style={{ fontSize: 11, color: "#C4C2D4", fontWeight: 500 }}>Coming soon</span>
            }
            border
          />
          <SettingsRow
            label={
              deleteStep === 0
                ? "Delete account"
                : deleteStep === 1
                  ? "Are you sure? This is permanent."
                  : "Deleting your account…"
            }
            danger
            action={
              deleteStep === 0 ? (
                <button
                  onClick={() => setDeleteStep(1)}
                  style={{
                    fontSize: 12, fontWeight: 600, color: "#E03E3E",
                    background: "rgba(224,62,62,0.06)",
                    border: "1px solid rgba(224,62,62,0.15)",
                    borderRadius: 20, padding: "5px 14px", cursor: "pointer",
                  }}
                >
                  Delete
                </button>
              ) : deleteStep === 1 ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setDeleteStep(0)}
                    style={{
                      fontSize: 12, fontWeight: 600, color: "#9E9CB0",
                      background: "rgba(0,0,0,0.04)",
                      border: "1px solid rgba(0,0,0,0.06)",
                      borderRadius: 20, padding: "5px 14px", cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setDeleteStep(2);
                      setDeleting(true);
                      const res = await fetch("/api/account/delete", { method: "POST" });
                      if (res.ok) {
                        await supabase.auth.signOut();
                        window.location.href = "/signup";
                      } else {
                        setDeleteStep(0);
                        setDeleting(false);
                        alert("Failed to delete account. Please try again.");
                      }
                    }}
                    disabled={deleting}
                    style={{
                      fontSize: 12, fontWeight: 600, color: "#FFFFFF",
                      background: "#E03E3E",
                      border: "1px solid #E03E3E",
                      borderRadius: 20, padding: "5px 14px", cursor: "pointer",
                    }}
                  >
                    Confirm delete
                  </button>
                </div>
              ) : (
                <span style={{ fontSize: 12, color: "#E03E3E" }}>Deleting…</span>
              )
            }
            border={false}
          />
        </SettingsSection>

        {/* ── Build & Update (debug) ─────────────────────────────── */}
        <SettingsSection title="Build & Update">
          <SettingsRow
            label="Build ID"
            value={build.shortBuild}
            border
          />
          <SettingsRow
            label="Built at"
            value={build.builtAtFormatted}
            border
          />
          <SettingsRow
            label="Last update check"
            value={lastUpdateCheck ?? "Not checked yet"}
            border
          />
          <SettingsRow
            label="Check for update"
            action={
              <button
                disabled={checking}
                onClick={async () => {
                  setChecking(true);
                  try {
                    const res = await fetch("/api/version", { cache: "no-store" });
                    const data = await res.json();
                    const now = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });
                    setLastUpdateCheck(now);
                    console.log("[PWA] manual check:", { current: build.buildId, fetched: data.buildId });
                    if (data.buildId !== build.buildId) {
                      if (confirm(`New build available: ${data.buildId}. Refresh now?`)) {
                        console.log("[PWA] manual reload triggered from settings");
                        window.location.reload();
                      }
                    } else {
                      alert("You're on the latest build.");
                    }
                  } catch {
                    alert("Could not check for updates.");
                  } finally {
                    setChecking(false);
                  }
                }}
                style={{
                  fontSize: 12, fontWeight: 600, color: "#6C69E0",
                  background: "rgba(108,105,224,0.06)",
                  border: "1px solid rgba(108,105,224,0.15)",
                  borderRadius: 20, padding: "5px 14px", cursor: "pointer",
                }}
              >
                {checking ? "Checking…" : "Check now"}
              </button>
            }
            border
          />
          <SettingsRow
            label="Reload latest version"
            action={
              <button
                onClick={() => {
                  console.log("[PWA] reload latest version from settings");
                  window.location.reload();
                }}
                style={{
                  fontSize: 12, fontWeight: 600, color: "#6C69E0",
                  background: "rgba(108,105,224,0.06)",
                  border: "1px solid rgba(108,105,224,0.15)",
                  borderRadius: 20, padding: "5px 14px", cursor: "pointer",
                }}
              >
                Reload
              </button>
            }
            border
          />
          <SettingsRow
            label="Clear cache + reload"
            action={
              <button
                onClick={async () => {
                  console.log("[PWA] clear cache + reload from settings");
                  const names = await caches.keys();
                  console.log(`[PWA] clearing ${names.length} caches:`, names);
                  await Promise.all(names.map((n) => caches.delete(n)));
                  console.log("[PWA] caches cleared, reloading");
                  window.location.reload();
                }}
                style={{
                  fontSize: 12, fontWeight: 600, color: "#D4810A",
                  background: "rgba(212,129,10,0.06)",
                  border: "1px solid rgba(212,129,10,0.15)",
                  borderRadius: 20, padding: "5px 14px", cursor: "pointer",
                }}
              >
                Clear & reload
              </button>
            }
            border={false}
          />
        </SettingsSection>

        {/* Version */}
        <p style={{ textAlign: "center", fontSize: 11, color: "#C4C2D4", letterSpacing: "0.04em" }}>
          MERIDIAN · v0.1 · {build.shortBuild}
        </p>

      </div>
    </div>
  );
}
