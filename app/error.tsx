"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
        textAlign:      "center",
      }}
    >
      <div
        style={{
          width:          56,
          height:         56,
          borderRadius:   18,
          background:     "rgba(224,62,62,0.08)",
          border:         "1px solid rgba(224,62,62,0.14)",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          marginBottom:   20,
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E03E3E" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h2
        style={{
          fontSize:      20,
          fontWeight:    700,
          color:         "#1C1A2E",
          letterSpacing: "-0.02em",
          marginBottom:  8,
        }}
      >
        Something went wrong
      </h2>
      <p style={{ fontSize: 14, color: "#9E9CB0", marginBottom: 24, maxWidth: 300, lineHeight: 1.5 }}>
        Meridian hit an unexpected issue. This has been noted.
      </p>
      <button
        onClick={reset}
        style={{
          padding:      "10px 24px",
          borderRadius: 12,
          background:   "#6C69E0",
          color:        "#FFFFFF",
          fontSize:     14,
          fontWeight:   600,
          border:       "none",
          cursor:       "pointer",
          boxShadow:    "0 2px 8px rgba(108,105,224,0.25)",
        }}
      >
        Try again
      </button>
    </div>
  );
}
