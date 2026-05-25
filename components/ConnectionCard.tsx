"use client";

/**
 * ConnectionCard — reusable integration tile.
 *
 * Used in: /onboarding step 3, /settings connections section.
 *
 * Status variants:
 *   available    — Meridian-native; can be activated now → "Enable" button
 *   connected    — active → "Disconnect" button
 *   disconnected — ready to connect → "Connect" button
 *   ready_soon   — launching soon → "Notify me" (disabled)
 *   coming_soon  — planned → no action button
 */

import type { Connection, ConnectionStatus } from "@/data/connections";

// ─── Status pill ──────────────────────────────────────────────────────────────

const STATUS_CFG: Record<
  ConnectionStatus,
  { label: string; bg: string; color: string }
> = {
  available:    { label: "Available",    bg: "rgba(61,154,122,0.10)",  color: "#3D9A7A" },
  connected:    { label: "Connected",    bg: "rgba(61,154,122,0.10)",  color: "#3D9A7A" },
  disconnected: { label: "Not connected",bg: "rgba(0,0,0,0.05)",       color: "#9E9CB0" },
  ready_soon:   { label: "Ready soon",   bg: "rgba(108,105,224,0.10)", color: "#6C69E0" },
  coming_soon:  { label: "Coming soon",  bg: "rgba(0,0,0,0.04)",       color: "#C4C2D4" },
};

function StatusPill({ status }: { status: ConnectionStatus }) {
  const { label, bg, color } = STATUS_CFG[status];
  return (
    <span
      style={{
        fontSize:      10,
        fontWeight:    600,
        letterSpacing: "0.06em",
        color,
        background:    bg,
        borderRadius:  20,
        padding:       "3px 9px",
        whiteSpace:    "nowrap",
        flexShrink:    0,
      }}
    >
      {label.toUpperCase()}
    </span>
  );
}

// ─── Connection icons ──────────────────────────────────────────────────────────

function ConnectionIcon({ id, color }: { id: string; color: string }) {
  const s = {
    stroke: color, fill: "none",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (id === "google-calendar") return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...s}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2"  x2="16" y2="6"  />
      <line x1="8"  y1="2"  x2="8"  y2="6"  />
      <line x1="3"  y1="10" x2="21" y2="10" />
      <rect x="8" y="14" width="3" height="3" rx="0.5" fill={color} stroke="none" />
    </svg>
  );

  if (id === "health-connect") return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...s}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill={`${color}22`} />
    </svg>
  );

  if (id === "apple-calendar") return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...s}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2"  x2="16" y2="6"  />
      <line x1="8"  y1="2"  x2="8"  y2="6"  />
      <line x1="3"  y1="10" x2="21" y2="10" />
    </svg>
  );

  if (id === "apple-health") return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...s}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill={`${color}22`} />
      <path d="M12 9v6m-3-3h6" />
    </svg>
  );

  if (id === "plaid") return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...s}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );

  // meridian-continuity — sparkle
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...s}>
      <path d="M12 2 L13.5 9.5 L21 12 L13.5 14.5 L12 22 L10.5 14.5 L3 12 L10.5 9.5 Z" fill={`${color}18`} />
    </svg>
  );
}

// ─── Action button ────────────────────────────────────────────────────────────

function ActionButton({
  status,
  onConnect,
  onDisconnect,
}: {
  status:       ConnectionStatus;
  onConnect:    () => void;
  onDisconnect: () => void;
}) {
  if (status === "coming_soon") return null;

  const cfg = {
    available:    { label: "Enable",     color: "#6C69E0", bg: "rgba(108,105,224,0.09)", border: "rgba(108,105,224,0.18)", action: onConnect     },
    connected:    { label: "Disconnect", color: "#9E9CB0", bg: "rgba(0,0,0,0.04)",       border: "rgba(0,0,0,0.07)",       action: onDisconnect  },
    disconnected: { label: "Connect",    color: "#6C69E0", bg: "rgba(108,105,224,0.09)", border: "rgba(108,105,224,0.18)", action: onConnect     },
    ready_soon:   { label: "Ready soon", color: "#6C69E0", bg: "rgba(108,105,224,0.06)", border: "rgba(108,105,224,0.12)", action: () => {}      },
    coming_soon:  { label: "",           color: "",        bg: "",                        border: "",                       action: () => {}      },
  }[status];

  return (
    <button
      onClick={cfg.action}
      disabled={status === "ready_soon"}
      style={{
        flexShrink:    0,
        fontSize:      12,
        fontWeight:    600,
        color:         cfg.color,
        background:    cfg.bg,
        border:        `1px solid ${cfg.border}`,
        borderRadius:  20,
        padding:       "6px 14px",
        cursor:        status === "ready_soon" ? "default" : "pointer",
        letterSpacing: "0.01em",
        whiteSpace:    "nowrap",
        opacity:       status === "ready_soon" ? 0.65 : 1,
      }}
    >
      {cfg.label}
    </button>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface ConnectionCardProps {
  connection:   Connection;
  showAction?:  boolean;
  /** Compact layout — hides benefit text, used in onboarding */
  compact?:     boolean;
}

export default function ConnectionCard({
  connection,
  showAction = true,
  compact    = false,
}: ConnectionCardProps) {
  const { id, name, benefit, status, chipBg, chipColor } = connection;

  function handleConnect() {
    // Not yet live — no-op
  }

  function handleDisconnect() {
    // Not yet live — no-op
  }

  return (
    <div
      style={{
        background:   "#FFFFFF",
        borderRadius: compact ? 14 : 16,
        border:       "1px solid rgba(0,0,0,0.06)",
        boxShadow:    "0 1px 2px rgba(0,0,0,0.03), 0 2px 8px rgba(0,0,0,0.04)",
        padding:      compact ? "12px 14px" : "14px 16px",
        display:      "flex",
        alignItems:   "center",
        gap:          12,
      }}
    >
      {/* Icon chip */}
      <div
        style={{
          width:          compact ? 36 : 40,
          height:         compact ? 36 : 40,
          borderRadius:   compact ? 10 : 12,
          background:     chipBg,
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          flexShrink:     0,
        }}
      >
        <ConnectionIcon id={id} color={chipColor} />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: compact ? 0 : 3, flexWrap: "wrap" }}>
          <p
            style={{
              fontSize:      compact ? 13 : 14,
              fontWeight:    600,
              color:         "#1C1A2E",
              letterSpacing: "-0.01em",
              lineHeight:    1.2,
            }}
          >
            {name}
          </p>
          <StatusPill status={status} />
        </div>
        {!compact && (
          <p style={{ fontSize: 12, color: "#9E9CB0", lineHeight: 1.45 }}>
            {benefit}
          </p>
        )}
      </div>

      {/* Action button */}
      {showAction && (
        <ActionButton
          status={status}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
        />
      )}
    </div>
  );
}
