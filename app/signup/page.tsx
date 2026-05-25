"use client";

/**
 * /signup — Meridian account creation screen.
 *
 * Email signup: triggers a confirmation email. After clicking the link
 * the user lands at /auth/callback which exchanges the code for a session.
 *
 * OAuth (Google / Apple):
 *   Requires enabling the provider in Supabase Dashboard →
 *   Authentication → Providers, then adding the client ID + secret.
 *   The redirect URL to whitelist is: {SITE_URL}/auth/callback
 */

import { useState }        from "react";
import Link                 from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient }     from "@/lib/supabase/client";

export default function SignupPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const supabase     = createClient();

  const next          = searchParams.get("next") ?? "/";
  const callbackError = searchParams.get("error");

  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(
    callbackError === "auth_callback_failed"
      ? "Sign-up failed. Please try again."
      : null,
  );
  const [confirmed, setConfirmed] = useState(false);

  const callbackUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback${next && next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`;

  async function handleEmailSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: callbackUrl,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setConfirmed(true);
    setLoading(false);
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

  // ── Email confirmation pending ─────────────────────────────────────────────
  if (confirmed) {
    return (
      <AuthShell>
        <div
          style={{
            width:        "100%",
            maxWidth:     420,
            background:   "#FFFFFF",
            borderRadius: 24,
            border:       "1px solid rgba(0,0,0,0.07)",
            boxShadow:    "0 2px 4px rgba(0,0,0,0.04), 0 12px 40px rgba(108,105,224,0.09)",
            padding:      "36px 32px",
            textAlign:    "center",
          }}
        >
          <div
            style={{
              width:          52,
              height:         52,
              borderRadius:   16,
              background:     "rgba(108,105,224,0.08)",
              border:         "1px solid rgba(108,105,224,0.14)",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              margin:         "0 auto 20px",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6C69E0" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1C1A2E", letterSpacing: "-0.02em", marginBottom: 10 }}>
            Check your email.
          </h2>
          <p style={{ fontSize: 14, color: "#9E9CB0", lineHeight: 1.6 }}>
            We sent a confirmation link to{" "}
            <strong style={{ color: "#3A3860", fontWeight: 600 }}>{email}</strong>.{" "}
            Click it to activate your account.
          </p>
        </div>
        <p style={{ fontSize: 13, color: "#9E9CB0", marginTop: 24 }}>
          Already confirmed?{" "}
          <Link href={`/login${next && next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} style={{ color: "#6C69E0", fontWeight: 500, textDecoration: "none" }}>
            Sign in
          </Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      {/* Card */}
      <div
        style={{
          width:        "100%",
          maxWidth:     420,
          background:   "#FFFFFF",
          borderRadius: 24,
          border:       "1px solid rgba(0,0,0,0.07)",
          boxShadow:    "0 2px 4px rgba(0,0,0,0.04), 0 12px 40px rgba(108,105,224,0.09)",
          padding:      "36px 32px",
        }}
      >
        <h1
          style={{
            fontSize:      23,
            fontWeight:    700,
            color:         "#1C1A2E",
            letterSpacing: "-0.025em",
            lineHeight:    1.2,
            marginBottom:  6,
          }}
        >
          Create your account.
        </h1>
        <p style={{ fontSize: 14, color: "#9E9CB0", lineHeight: 1.55, marginBottom: 28 }}>
          Build a calmer, clearer system for your life.
        </p>

        {/* OAuth — social first for lower friction */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          <SocialButton provider="google" label="Continue with Google" onClick={handleGoogle} />
          <SocialButton provider="apple"  label="Continue with Apple"  onClick={handleApple}  />
        </div>

        <Divider />

        {/* Email + password form */}
        <form onSubmit={handleEmailSignup} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <AuthInput type="email"    placeholder="Email"    value={email}    onChange={setEmail}    required />
          <AuthInput type="password" placeholder="Password" value={password} onChange={setPassword} required />

          {error && (
            <p style={{ fontSize: 12, color: "#D93025", letterSpacing: "-0.01em", marginTop: -4 }}>
              {error}
            </p>
          )}

          <PrimaryButton loading={loading} label="Create account" />
        </form>

        <p
          style={{
            fontSize:   12,
            color:      "#B0AEC4",
            marginTop:  16,
            lineHeight: 1.55,
            textAlign:  "center",
            letterSpacing: "-0.01em",
          }}
        >
          By continuing you agree to Meridian&apos;s{" "}
          <span style={{ color: "#9E9CB0", textDecoration: "underline", cursor: "pointer" }}>Terms of Service</span>
          {" "}and{" "}
          <span style={{ color: "#9E9CB0", textDecoration: "underline", cursor: "pointer" }}>Privacy Policy</span>.
        </p>
      </div>

      {/* Footer */}
      <p style={{ fontSize: 13, color: "#9E9CB0", marginTop: 24 }}>
        Already have an account?{" "}
        <Link href={`/login${next && next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} style={{ color: "#6C69E0", fontWeight: 500, textDecoration: "none" }}>
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}

// ─── Layout shell ─────────────────────────────────────────────────────────────

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight:     "100dvh",
        background:    "#F7F6FA",
        display:       "flex",
        flexDirection: "column",
        alignItems:    "center",
        padding:       "max(48px, 10vh) 20px 40px",
      }}
    >
      {/* Wordmark */}
      <p
        style={{
          fontSize:      13,
          fontWeight:    400,
          letterSpacing: "0.18em",
          color:         "#A8A6BC",
          marginBottom:  36,
          userSelect:    "none",
        }}
      >
        meridian
      </p>

      {children}
    </div>
  );
}

// ─── Form primitives ──────────────────────────────────────────────────────────

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
        height:        50,
        borderRadius:  12,
        border:        "1.5px solid rgba(0,0,0,0.10)",
        background:    "#FAFAFA",
        padding:       "0 15px",
        fontSize:      15,
        color:         "#1C1A2E",
        outline:       "none",
        boxSizing:     "border-box",
        letterSpacing: "-0.01em",
        transition:    "border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease",
      }}
      onFocus={(e) => {
        e.target.style.borderColor = "rgba(108,105,224,0.50)";
        e.target.style.boxShadow   = "0 0 0 3.5px rgba(108,105,224,0.10)";
        e.target.style.background  = "#FFFFFF";
      }}
      onBlur={(e) => {
        e.target.style.borderColor = "rgba(0,0,0,0.10)";
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
        height:        50,
        borderRadius:  12,
        background:    loading ? "rgba(108,105,224,0.55)" : "#6C69E0",
        color:         "#FFFFFF",
        fontSize:      15,
        fontWeight:    600,
        border:        "none",
        cursor:        loading ? "not-allowed" : "pointer",
        letterSpacing: "-0.01em",
        boxShadow:     loading
          ? "none"
          : "0 1px 2px rgba(108,105,224,0.20), 0 4px 16px rgba(108,105,224,0.28)",
        marginTop:     4,
        transition:    "background 0.15s ease, box-shadow 0.15s ease",
      }}
    >
      {loading ? "Creating account…" : label}
    </button>
  );
}

function Divider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 0 20px" }}>
      <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.07)" }} />
      <p style={{ fontSize: 12, color: "#C4C2D4", letterSpacing: "0.05em" }}>or</p>
      <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.07)" }} />
    </div>
  );
}

// ─── Social button ────────────────────────────────────────────────────────────

function SocialButton({
  provider,
  label,
  onClick,
}: {
  provider: "google" | "apple";
  label:    string;
  onClick:  () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        width:          "100%",
        height:         50,
        borderRadius:   12,
        background:     pressed ? "rgba(0,0,0,0.03)" : hovered ? "#FAFAFA" : "#FFFFFF",
        border:         `1.5px solid ${hovered ? "rgba(0,0,0,0.16)" : "rgba(0,0,0,0.11)"}`,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        gap:            10,
        fontSize:       14,
        fontWeight:     500,
        color:          "#1C1A2E",
        cursor:         "pointer",
        letterSpacing:  "-0.01em",
        boxShadow:      pressed
          ? "none"
          : hovered
          ? "0 2px 8px rgba(0,0,0,0.08)"
          : "0 1px 3px rgba(0,0,0,0.06)",
        transform:      pressed ? "scale(0.99)" : "scale(1)",
        transition:     "background 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease, transform 0.08s ease",
        userSelect:     "none",
      }}
    >
      {provider === "google" ? <GoogleMark /> : <AppleMark />}
      {label}
    </button>
  );
}

// ─── Provider marks ───────────────────────────────────────────────────────────

function GoogleMark() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

/**
 * Apple mark — standard 24×24 coordinate space path from SimpleIcons.
 * Renders crisp at any size because it's a clean SVG path, not a scaled bitmap.
 */
function AppleMark() {
  return (
    <svg
      width="17"
      height="20"
      viewBox="0 0 24 24"
      fill="#1C1A2E"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701z" />
    </svg>
  );
}
