"use client";

/**
 * AmbientBar — a whisper of system awareness above the Ask Meridian composer.
 *
 * One quiet line. No hierarchy. No urgency.
 * It should feel like reading the status line of an operating system —
 * there if you notice it, invisible if you don't.
 */

import { useMeridian, getAmbientSnippets } from "@/lib/meridian-context";

export default function AmbientBar() {
  const ctx      = useMeridian();
  const snippets = getAmbientSnippets(ctx);

  if (snippets.length === 0) return null;

  // Show at most 2 snippets to keep it minimal
  const text = snippets.slice(0, 2).join("  ·  ");

  return (
    <div
      style={{
        position:       "fixed",
        bottom:         "calc(60px + env(safe-area-inset-bottom, 0px) + 72px)",
        left:           "50%",
        transform:      "translateX(-50%)",
        width:          "min(calc(100% - 48px), 460px)",
        zIndex:         39,
        display:        "flex",
        justifyContent: "center",
        pointerEvents:  "none",
      }}
    >
      <p
        style={{
          fontSize:      11,
          color:         "#C4C2D4",
          letterSpacing: "0.05em",
          lineHeight:    1,
          opacity:       0.85,
        }}
      >
        {text}
      </p>
    </div>
  );
}
