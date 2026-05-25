"use client";

/**
 * /onboarding — linear first-run flow.
 *
 * Steps:
 *   0  Welcome
 *   1  What creates the most mental load? (multi-select)
 *   2  What should Meridian protect? (multi-select)
 *   3  Connect your life (connection cards)
 *   4  Privacy promise → Enter Meridian
 *
 * On completion:
 *   - writes user_preferences to Supabase (if session exists)
 *   - marks profiles.onboarding_complete = true
 *   - fails gracefully — always routes to / regardless of write success
 */

import { useState }    from "react";
import { useRouter }   from "next/navigation";
import ConnectionCard  from "@/components/ConnectionCard";
import { CONNECTIONS } from "@/data/connections";
import { createClient } from "@/lib/supabase/client";

const TOTAL_STEPS = 5;

// ─── Step content data ────────────────────────────────────────────────────────

interface SelectOption {
  id:    string;
  label: string;
  icon:  React.ReactNode;
}

const MENTAL_LOAD_OPTIONS: SelectOption[] = [
  { id: "fragmented-schedule",    label: "Fragmented schedule",      icon: <GridIcon />    },
  { id: "too-many-tasks",         label: "Too many unfinished tasks", icon: <ListIcon />    },
  { id: "forgetting-things",      label: "Forgetting things",        icon: <BrainIcon />   },
  { id: "work-overload",          label: "Work overload",            icon: <BriefcaseIcon/>},
  { id: "health-energy",          label: "Health and energy",        icon: <HeartIcon />   },
  { id: "money-stress",           label: "Money stress",             icon: <CoinIcon />    },
  { id: "family-logistics",       label: "Family logistics",         icon: <FamilyIcon />  },
  { id: "lack-of-focus",          label: "Lack of focus",            icon: <FocusIcon />   },
];

const PROTECT_OPTIONS: SelectOption[] = [
  { id: "focus",             label: "Focus",            icon: <FocusIcon />   },
  { id: "calm",              label: "Calm",             icon: <LeafIcon />    },
  { id: "energy",            label: "Energy",           icon: <ZapIcon />     },
  { id: "momentum",          label: "Momentum",         icon: <ArrowIcon />   },
  { id: "family-time",       label: "Family time",      icon: <FamilyIcon />  },
  { id: "financial-clarity", label: "Financial clarity",icon: <CoinIcon />    },
  { id: "recovery",          label: "Recovery",         icon: <MoonIcon />    },
  { id: "consistency",       label: "Consistency",      icon: <GridIcon />    },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [step,           setStep]           = useState(0);
  const [selectedLoad,   setSelectedLoad]   = useState<string[]>([]);
  const [selectedProtect,setSelectedProtect]= useState<string[]>([]);
  const [finishing,      setFinishing]      = useState(false);

  function next() { setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1)); }
  function back() { setStep((s) => Math.max(s - 1, 0)); }

  function toggleLoad(id: string) {
    setSelectedLoad((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  }
  function toggleProtect(id: string) {
    setSelectedProtect((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  }

  async function finish() {
    setFinishing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Sync OAuth profile fields (name, avatar) when available
        const oauthMeta = user.user_metadata ?? {};
        const profileUpdate: Record<string, string | null> = {
          email: user.email ?? null,
        };
        const fullName =
          oauthMeta.full_name ?? oauthMeta.name ?? oauthMeta.display_name ?? null;
        const avatar =
          oauthMeta.avatar_url ?? oauthMeta.picture ?? null;
        if (fullName) profileUpdate.full_name = fullName;
        if (oauthMeta.display_name) profileUpdate.display_name = oauthMeta.display_name;
        else if (fullName) profileUpdate.display_name = fullName;
        if (avatar) profileUpdate.avatar_url = avatar;

        await supabase
          .from("profiles")
          .update({ ...profileUpdate, updated_at: new Date().toISOString() })
          .eq("id", user.id);

        const { error: prefError } = await supabase
          .from("user_preferences")
          .upsert(
            {
              user_id:        user.id,
              mental_load:    selectedLoad,
              protect_values: selectedProtect,
            },
            { onConflict: "user_id" },
          );

        if (prefError) {
          console.warn("[Meridian] Could not save onboarding preferences:", prefError.message);
        }

        // Mark onboarding complete
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ onboarding_complete: true, updated_at: new Date().toISOString() })
          .eq("id", user.id);

        if (profileError) {
          console.warn("[Meridian] Could not mark onboarding complete:", profileError.message);
        }
      } else {
        console.warn(
          "[Meridian] No active session — onboarding preferences not saved. " +
          "This is expected during local development without auth configured.",
        );
      }
    } catch (err) {
      console.warn("[Meridian] Onboarding save failed unexpectedly:", err);
    }

    // Always route forward — never block the user on a save failure
    router.push("/");
  }

  return (
    <div
      style={{
        minHeight:     "100dvh",
        background:    "#F7F6FA",
        display:       "flex",
        flexDirection: "column",
      }}
    >
      {/* ── Chrome: wordmark + progress ────────────────────────────── */}
      <div
        style={{
          flexShrink: 0,
          padding:    "20px 24px 0",
        }}
      >
        <p
          style={{
            fontSize:      12,
            fontWeight:    400,
            letterSpacing: "0.16em",
            color:         "#C4C2D4",
            marginBottom:  22,
            textAlign:     "center",
            userSelect:    "none",
          }}
        >
          meridian
        </p>

        {/* Step progress — expanding pill */}
        <div style={{ display: "flex", gap: 5, justifyContent: "center", marginBottom: 36 }}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              style={{
                height:       5,
                width:        i === step ? 24 : 5,
                borderRadius: 3,
                background:   i === step
                  ? "#6C69E0"
                  : i < step
                  ? "rgba(108,105,224,0.30)"
                  : "rgba(0,0,0,0.09)",
                transition:   "width 0.22s ease, background 0.22s ease",
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Scrollable step content ─────────────────────────────────── */}
      <div
        style={{
          flex:      1,
          overflowY: "auto",
          padding:   "0 24px",
        }}
      >
        {step === 0 && <StepWelcome onNext={next} />}
        {step === 1 && (
          <StepSelect
            question="What usually creates the most mental load?"
            hint="Select everything that resonates."
            options={MENTAL_LOAD_OPTIONS}
            selected={selectedLoad}
            onToggle={toggleLoad}
            onNext={next}
          />
        )}
        {step === 2 && (
          <StepSelect
            question="What should Meridian protect?"
            hint="This shapes what Meridian pays attention to."
            options={PROTECT_OPTIONS}
            selected={selectedProtect}
            onToggle={toggleProtect}
            onNext={next}
          />
        )}
        {step === 3 && <StepConnect onNext={next} />}
        {step === 4 && <StepPrivacy onFinish={finish} loading={finishing} />}
      </div>

      {/* ── Back navigation ─────────────────────────────────────────── */}
      {step > 0 && (
        <div style={{ flexShrink: 0, padding: "12px 24px 20px" }}>
          <button
            onClick={back}
            style={{
              display:    "flex",
              alignItems: "center",
              gap:        4,
              background: "none",
              border:     "none",
              fontSize:   13,
              color:      "#C4C2D4",
              cursor:     "pointer",
              padding:    0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Step 0 — Welcome ─────────────────────────────────────────────────────────

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div
      style={{
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        textAlign:      "center",
        paddingTop:     16,
        paddingBottom:  32,
      }}
    >
      {/* Meridian mark */}
      <div
        style={{
          width:          72,
          height:         72,
          borderRadius:   22,
          background:     "linear-gradient(145deg, #EEEDFB 0%, #F7F6FA 100%)",
          border:         "1px solid rgba(108,105,224,0.16)",
          boxShadow:      "0 4px 24px rgba(108,105,224,0.12)",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          marginBottom:   28,
        }}
      >
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#6C69E0" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2 L13.5 9.5 L21 12 L13.5 14.5 L12 22 L10.5 14.5 L3 12 L10.5 9.5 Z" fill="rgba(108,105,224,0.10)" />
        </svg>
      </div>

      <h1
        style={{
          fontSize:      28,
          fontWeight:    700,
          color:         "#1C1A2E",
          letterSpacing: "-0.03em",
          lineHeight:    1.2,
          marginBottom:  12,
        }}
      >
        Welcome to Meridian
      </h1>
      <p
        style={{
          fontSize:      16,
          color:         "#9E9CB0",
          lineHeight:    1.6,
          maxWidth:      260,
          marginBottom:  48,
        }}
      >
        Your calm AI operating system for life.
      </p>

      <ContinueButton label="Begin" onClick={onNext} />

      <p style={{ fontSize: 12, color: "#C4C2D4", marginTop: 16 }}>
        Takes about 2 minutes.
      </p>
    </div>
  );
}

// ─── Steps 1 & 2 — Card selection ────────────────────────────────────────────

function StepSelect({
  question,
  hint,
  options,
  selected,
  onToggle,
  onNext,
}: {
  question: string;
  hint:     string;
  options:  SelectOption[];
  selected: string[];
  onToggle: (id: string) => void;
  onNext:   () => void;
}) {
  return (
    <div style={{ paddingBottom: 32 }}>
      <StepHeader question={question} hint={hint} />

      {/* 2-column card grid */}
      <div
        style={{
          display:             "grid",
          gridTemplateColumns: "1fr 1fr",
          gap:                 10,
          marginBottom:        32,
        }}
      >
        {options.map((opt) => {
          const active = selected.includes(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => onToggle(opt.id)}
              style={{
                background:    active ? "rgba(108,105,224,0.07)" : "#FFFFFF",
                border:        active
                  ? "1.5px solid rgba(108,105,224,0.35)"
                  : "1px solid rgba(0,0,0,0.07)",
                borderRadius:  14,
                padding:       "14px 12px",
                cursor:        "pointer",
                textAlign:     "left",
                display:       "flex",
                flexDirection: "column",
                gap:           8,
                boxShadow:     active
                  ? "0 2px 12px rgba(108,105,224,0.10)"
                  : "0 1px 2px rgba(0,0,0,0.03)",
                transition:    "all 0.15s ease",
              }}
            >
              {/* Icon in a soft chip */}
              <div
                style={{
                  width:          32,
                  height:         32,
                  borderRadius:   9,
                  background:     active ? "rgba(108,105,224,0.12)" : "rgba(0,0,0,0.04)",
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  color:          active ? "#6C69E0" : "#9E9CB0",
                  transition:     "all 0.15s ease",
                }}
              >
                {opt.icon}
              </div>
              <p
                style={{
                  fontSize:      13,
                  fontWeight:    active ? 600 : 500,
                  color:         active ? "#1C1A2E" : "#3A3860",
                  lineHeight:    1.3,
                  letterSpacing: "-0.01em",
                }}
              >
                {opt.label}
              </p>
            </button>
          );
        })}
      </div>

      <ContinueButton
        label={selected.length > 0 ? "Continue" : "Skip for now"}
        onClick={onNext}
      />
    </div>
  );
}

// ─── Step 3 — Connect ─────────────────────────────────────────────────────────

function StepConnect({ onNext }: { onNext: () => void }) {
  return (
    <div style={{ paddingBottom: 32 }}>
      <StepHeader
        question="Connect your life"
        hint="Meridian becomes more aware the more it can see. Everything is optional — you can always connect later from Settings."
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
        {CONNECTIONS.map((conn) => (
          <ConnectionCard key={conn.id} connection={conn} showAction compact={false} />
        ))}
      </div>

      <ContinueButton label="Continue" onClick={onNext} />

      <button
        onClick={onNext}
        style={{
          width:         "100%",
          marginTop:     10,
          padding:       "12px",
          background:    "none",
          border:        "none",
          fontSize:      13,
          color:         "#C4C2D4",
          cursor:        "pointer",
          letterSpacing: "-0.01em",
        }}
      >
        Skip for now
      </button>
    </div>
  );
}

// ─── Step 4 — Privacy ─────────────────────────────────────────────────────────

function StepPrivacy({ onFinish, loading }: { onFinish: () => void; loading: boolean }) {
  return (
    <div
      style={{
        display:       "flex",
        flexDirection: "column",
        alignItems:    "center",
        textAlign:     "center",
        paddingTop:    8,
        paddingBottom: 32,
      }}
    >
      {/* Shield */}
      <div
        style={{
          width:          64,
          height:         64,
          borderRadius:   20,
          background:     "rgba(61,154,122,0.07)",
          border:         "1px solid rgba(61,154,122,0.14)",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          marginBottom:   24,
        }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#3D9A7A" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="rgba(61,154,122,0.08)" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
      </div>

      <h2
        style={{
          fontSize:      24,
          fontWeight:    700,
          color:         "#1C1A2E",
          letterSpacing: "-0.025em",
          lineHeight:    1.2,
          marginBottom:  16,
        }}
      >
        Your data is yours.
      </h2>

      {/* Privacy statement */}
      <div
        style={{
          background:   "rgba(255,255,255,0.80)",
          border:       "1px solid rgba(0,0,0,0.06)",
          borderRadius: 16,
          padding:      "20px 18px",
          marginBottom: 36,
          textAlign:    "left",
          maxWidth:     380,
          width:        "100%",
        }}
      >
        <p
          style={{
            fontSize:   15,
            color:      "#3A3860",
            lineHeight: 1.65,
            letterSpacing: "-0.01em",
          }}
        >
          Meridian becomes more useful when it understands your patterns. You control what it can access, what it remembers, and what can be removed.
        </p>

        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            "No data is ever sold or shared.",
            "You can revoke any connection from Settings.",
            "Delete everything at any time.",
          ].map((line, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div
                style={{
                  width:          16,
                  height:         16,
                  borderRadius:   "50%",
                  background:     "rgba(61,154,122,0.12)",
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  flexShrink:     0,
                  marginTop:      1,
                }}
              >
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#3D9A7A" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p style={{ fontSize: 13, color: "#64627A", lineHeight: 1.5 }}>{line}</p>
            </div>
          ))}
        </div>
      </div>

      <ContinueButton
        label={loading ? "Setting up…" : "Enter Meridian"}
        onClick={onFinish}
        disabled={loading}
      />
    </div>
  );
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function StepHeader({ question, hint }: { question: string; hint: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2
        style={{
          fontSize:      22,
          fontWeight:    700,
          color:         "#1C1A2E",
          letterSpacing: "-0.025em",
          lineHeight:    1.25,
          marginBottom:  8,
        }}
      >
        {question}
      </h2>
      <p style={{ fontSize: 14, color: "#9E9CB0", lineHeight: 1.55 }}>
        {hint}
      </p>
    </div>
  );
}

function ContinueButton({
  label,
  onClick,
  disabled,
}: {
  label:     string;
  onClick:   () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width:         "100%",
        height:        52,
        borderRadius:  14,
        background:    disabled ? "rgba(108,105,224,0.55)" : "#6C69E0",
        color:         "#FFFFFF",
        fontSize:      16,
        fontWeight:    600,
        border:        "none",
        cursor:        disabled ? "not-allowed" : "pointer",
        letterSpacing: "-0.01em",
        boxShadow:     disabled ? "none" : "0 2px 12px rgba(108,105,224,0.22)",
        transition:    "background 0.15s ease",
      }}
    >
      {label}
    </button>
  );
}

// ─── Step option icons ────────────────────────────────────────────────────────
// Small 16×16 SVGs for the selection cards.

function GridIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}
function ListIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6"  x2="21" y2="6"  />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6"  x2="3.01" y2="6"  />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}
function BrainIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.44-4.24z" />
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.44-4.24z" />
    </svg>
  );
}
function BriefcaseIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <line x1="12" y1="12" x2="12" y2="12" strokeWidth={2.5} />
    </svg>
  );
}
function HeartIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
function CoinIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v2m0 8v2m-4-6h2a2 2 0 1 0 0-4h-1a2 2 0 1 1 0-4h2" />
    </svg>
  );
}
function FamilyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function FocusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M3 12h2m14 0h2M12 3v2m0 14v2" />
    </svg>
  );
}
function LeafIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C9 2 4 7 4 13a8 8 0 0 0 16 0C20 7 15 2 12 2Z" />
      <line x1="12" y1="21" x2="12" y2="23" />
    </svg>
  );
}
function ZapIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
function ArrowIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
