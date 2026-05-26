"use client";

/**
 * /login — Meridian authentication screen.
 *
 * OAuth (Google / Apple):
 *   Requires enabling the provider in Supabase Dashboard →
 *   Authentication → Providers, then adding the client ID + secret.
 *   The redirect URL to whitelist is: {SITE_URL}/auth/callback
 */

import { Suspense, useState } from "react";
import Link                 from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient }     from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const supabase     = createClient();

  const next         = searchParams.get("next") ?? "/";
  const callbackError = searchParams.get("error");

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(
    callbackError === "auth_callback_failed"
      ? "Sign-in failed. Please try again."
      : null,
  );

  const callbackUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback${next && next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`;

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push(next.startsWith("/") ? next : "/");
    router.refresh();
  }

  async function handleGoogle() {
    setError(null);
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl },
    });
    if (authError) setError(authError.message);
  }

  async function handleApple() {
    setError(null);
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo: callbackUrl },
    });
    if (authError) setError(authError.message);
  }

  return (
    <div
      style={{
        minHeight:      "100dvh",
        background:     "#F7F6FA",
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        padding:        "24px 20px",
      }}
    >
      {/* Wordmark */}
      <p
        style={{
          fontSize:      13,
          fontWeight:    400,
          letterSpacing: "0.16em",
          color:         "#C4C2D4",
          marginBottom:  40,
        }}
      >
        meridian
      </p>

      {/* Card */}
      <div
        style={{
          width:        "100%",
          maxWidth:     400,
          background:   "#FFFFFF",
          borderRadius: 24,
          border:       "1px solid rgba(0,0,0,0.06)",
          boxShadow:    "0 2px 4px rgba(0,0,0,0.04), 0 8px 32px rgba(108,105,224,0.07)",
          padding:      "32px 28px",
        }}
      >
        <h1
          style={{
            fontSize:      22,
            fontWeight:    700,
            color:         "#1C1A2E",
            letterSpacing: "-0.025em",
            marginBottom:  6,
          }}
        >
          Welcome back.
        </h1>
        <p style={{ fontSize: 14, color: "#9E9CB0", marginBottom: 28 }}>
          Sign in to continue to Meridian.
        </p>

        {/* Form */}
        <form onSubmit={handleEmailLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <AuthInput
            type="email"
            placeholder="Email"
            value={email}
            onChange={setEmail}
            required
          />
          <AuthInput
            type="password"
            placeholder="Password"
            value={password}
            onChange={setPassword}
            required
          />

          {error && (
            <p style={{ fontSize: 12, color: "#E03E3E", marginTop: -4 }}>{error}</p>
          )}

          <PrimaryButton loading={loading} label="Sign in" />
        </form>

        {/* Divider */}
        <Divider />

        {/* Social auth */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <SocialButton icon="google" label="Continue with Google" onClick={handleGoogle} />
          <SocialButton icon="apple"  label="Continue with Apple"  onClick={handleApple}  />
        </div>
      </div>

      {/* Footer */}
      <p style={{ fontSize: 13, color: "#9E9CB0", marginTop: 24 }}>
        Don&apos;t have an account?{" "}
        <Link
          href={`/signup${next && next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}
          style={{ color: "#6C69E0", fontWeight: 500, textDecoration: "none" }}
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}

// ─── Shared form primitives ───────────────────────────────────────────────────

function AuthInput({
  type,
  placeholder,
  value,
  onChange,
  required,
}: {
  type:        string;
  placeholder: string;
  value:       string;
  onChange:    (v: string) => void;
  required?:   boolean;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      style={{
        width:         "100%",
        height:        48,
        borderRadius:  12,
        border:        "1px solid rgba(0,0,0,0.09)",
        background:    "#FAFAFA",
        padding:       "0 14px",
        fontSize:      15,
        color:         "#1C1A2E",
        outline:       "none",
        boxSizing:     "border-box",
        letterSpacing: "-0.01em",
        transition:    "border-color 0.15s ease, box-shadow 0.15s ease",
      }}
      onFocus={(e) => {
        e.target.style.borderColor  = "rgba(108,105,224,0.4)";
        e.target.style.boxShadow    = "0 0 0 3px rgba(108,105,224,0.08)";
        e.target.style.background   = "#FFFFFF";
      }}
      onBlur={(e) => {
        e.target.style.borderColor = "rgba(0,0,0,0.09)";
        e.target.style.boxShadow   = "none";
        e.target.style.background  = "#FAFAFA";
      }}
    />
  );
}

function PrimaryButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        width:         "100%",
        height:        48,
        borderRadius:  12,
        background:    loading ? "rgba(108,105,224,0.6)" : "#6C69E0",
        color:         "#FFFFFF",
        fontSize:      15,
        fontWeight:    600,
        border:        "none",
        cursor:        loading ? "not-allowed" : "pointer",
        letterSpacing: "-0.01em",
        boxShadow:     "0 2px 8px rgba(108,105,224,0.25)",
        marginTop:     4,
        transition:    "background 0.15s ease",
      }}
    >
      {loading ? "Signing in…" : label}
    </button>
  );
}

function Divider() {
  return (
    <div
      style={{
        display:     "flex",
        alignItems:  "center",
        gap:         12,
        margin:      "20px 0",
      }}
    >
      <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.06)" }} />
      <p style={{ fontSize: 12, color: "#C4C2D4", letterSpacing: "0.04em" }}>or</p>
      <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.06)" }} />
    </div>
  );
}

function SocialButton({
  icon,
  label,
  onClick,
}: {
  icon:    "google" | "apple";
  label:   string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width:          "100%",
        height:         48,
        borderRadius:   12,
        background:     "#FFFFFF",
        border:         "1px solid rgba(0,0,0,0.09)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        gap:            10,
        fontSize:       14,
        fontWeight:     500,
        color:          "#1C1A2E",
        cursor:         "pointer",
        letterSpacing:  "-0.01em",
        boxShadow:      "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      {icon === "google" ? <GoogleMark /> : <AppleMark />}
      {label}
    </button>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg width="16" height="18" viewBox="0 0 814 1000" fill="#1C1A2E">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 376.8 43.4 289.2 43.4 254.4c0-152.5 100.3-232.8 196.2-232.8 51.6 0 94.5 33.9 126.9 33.9 30.8 0 79.1-35.8 137.9-35.8 23.3 0 104.9 3.2 155.3 80.7zm-73.7-216c27.9-33.9 47.6-81 47.6-128.1 0-6.4-.6-12.9-1.9-18.1-44.9 1.6-98.4 30.2-131 68.7-26 29.2-50.3 76.3-50.3 124.1 0 7.1 1.3 14.2 1.9 16.5 2.9.6 7.7 1.3 12.6 1.3 40 0 90.3-27.2 121.1-64.4z" />
    </svg>
  );
}
