"use client";

export default function ThinkingIndicator() {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", animation: "fade-up 0.25s ease both" }}>
      <div style={{
        background: "#FFFFFF",
        borderRadius: "18px 18px 18px 4px",
        border: "1px solid rgba(0,0,0,0.07)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        padding: "12px 16px",
        display: "flex", alignItems: "center", gap: 5,
      }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 7, height: 7, borderRadius: "50%", background: "#C4C2D4",
              display: "block",
              animation: `pulse-dot 1.2s ease-in-out ${i * 0.22}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
