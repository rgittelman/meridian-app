import Link from "next/link";

export default function NotFound() {
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
      <p
        style={{
          fontSize:      13,
          fontWeight:    400,
          letterSpacing: "0.16em",
          color:         "#C4C2D4",
          marginBottom:  32,
        }}
      >
        meridian
      </p>
      <h1
        style={{
          fontSize:      48,
          fontWeight:    700,
          color:         "#1C1A2E",
          letterSpacing: "-0.03em",
          marginBottom:  8,
        }}
      >
        404
      </h1>
      <p style={{ fontSize: 14, color: "#9E9CB0", marginBottom: 28, maxWidth: 280, lineHeight: 1.5 }}>
        This page doesn&apos;t exist. Let&apos;s get you back.
      </p>
      <Link
        href="/"
        style={{
          padding:        "10px 24px",
          borderRadius:   12,
          background:     "#6C69E0",
          color:          "#FFFFFF",
          fontSize:       14,
          fontWeight:     600,
          textDecoration: "none",
          boxShadow:      "0 2px 8px rgba(108,105,224,0.25)",
        }}
      >
        Go home
      </Link>
    </div>
  );
}
