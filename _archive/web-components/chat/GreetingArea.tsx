"use client";

const QUICK_ACTIONS = [
  { id: "focus",      label: "Focus",      bg: "#EEEDFB", color: "#6C69E0", prompt: "Help me focus and reduce distraction today." },
  { id: "plan",       label: "Plan",       bg: "#E6F5F0", color: "#3A9A7A", prompt: "Help me plan my day clearly." },
  { id: "prioritize", label: "Prioritize", bg: "#FFF5E6", color: "#D4810A", prompt: "Help me ruthlessly prioritize what matters." },
  { id: "reflect",    label: "Reflect",    bg: "#FFE8F3", color: "#C4597A", prompt: "Let's reflect on how things are going." },
];

interface GreetingAreaProps {
  userName?: string | null;
  onAction: (text: string) => void;
}

export default function GreetingArea({ userName, onAction }: GreetingAreaProps) {
  const hour = new Date().getHours();
  const name = userName?.split(" ")[0] ?? "there";

  const greeting =
    hour < 12 ? `Good morning, ${name}.`
    : hour < 17 ? `Good afternoon, ${name}.`
    : `Good evening, ${name}.`;

  const contextLine =
    hour < 12 ? "What's on your mind?"
    : hour < 17 ? "What needs your attention?"
    : "How did today go?";

  return (
    <div style={{ paddingBottom: 32, paddingTop: 4, animation: "fade-up 0.4s ease both" }}>
      <h2 style={{
        fontSize: 22, fontWeight: 700, color: "#1C1A2E",
        letterSpacing: "-0.025em", lineHeight: 1.2, marginBottom: 6,
      }}>
        {greeting}
      </h2>
      <p style={{ fontSize: 14, color: "#9E9CB0", lineHeight: 1.5, marginBottom: 22 }}>
        {contextLine}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => onAction(action.prompt)}
            className="tap-scale"
            style={{
              background: action.bg, border: "none", borderRadius: 20,
              padding: "8px 16px", fontSize: 13, fontWeight: 500,
              color: action.color, cursor: "pointer",
              minHeight: 36,
            }}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
