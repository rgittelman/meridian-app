"use client";

/**
 * ContextInsight — ambient intelligence chip.
 *
 * Displays a single quiet insight from Meridian.
 *
 * Priority:
 *  1. `insight` prop — server-generated via Ollama (Today page)
 *  2. getContextualInsight(ctx) — derived from client-side system context
 *
 * Returns null when nothing meaningful is available.
 */

import { useMeridian, getContextualInsight } from "@/lib/meridian-context";

interface Props {
  /** Pre-generated insight from the server. Takes priority over context. */
  insight?: string;
}

export default function ContextInsight({ insight: propInsight }: Props) {
  const ctx    = useMeridian();
  const text   = propInsight ?? getContextualInsight(ctx);

  if (!text) return null;

  return (
    <div style={{ marginBottom: 16, marginTop: -2 }}>
      <div
        style={{
          display:     "inline-flex",
          alignItems:  "center",
          gap:         7,
          background:  "rgba(108,105,224,0.07)",
          border:      "1px solid rgba(108,105,224,0.13)",
          borderRadius: 20,
          padding:     "6px 12px 6px 8px",
        }}
      >
        <span
          style={{
            width:        5,
            height:       5,
            borderRadius: "50%",
            background:   "#6C69E0",
            opacity:      0.50,
            display:      "inline-block",
            flexShrink:   0,
          }}
        />
        <p
          style={{
            fontSize:      12,
            color:         "#6C69E0",
            opacity:       0.78,
            letterSpacing: "0.01em",
            lineHeight:    1.4,
          }}
        >
          {text}
        </p>
      </div>
    </div>
  );
}
