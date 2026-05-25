"use client";

/**
 * ChatDevBar — Development-only cognition/memory transparency during chat.
 */

import { useState } from "react";

interface ChatDevBarProps {
  memoryCount:  number;
  memoryIds:    string[];
  provider?:    string;
  toneState?:   string;
  patternCount?: number;
}

export default function ChatDevBar({
  memoryCount, memoryIds, provider, toneState, patternCount,
}: ChatDevBarProps) {
  const [expanded, setExpanded] = useState(false);
  const [inspect,  setInspect]  = useState<Record<string, unknown> | null>(null);

  if (process.env.NODE_ENV !== "development") return null;

  async function inspectContext() {
    const res = await fetch("/api/memory/debug", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "assemble", query: "" }),
    });
    const data = await res.json();
    setInspect(data);
    console.log("[chat:dev:context]", data);
  }

  async function inspectBriefing() {
    const res = await fetch("/api/memory/debug", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "briefing" }),
    });
    const data = await res.json();
    setInspect(data);
    console.log("[chat:dev:briefing]", data);
  }

  return (
    <div style={{
      borderTop: "1px dashed rgba(108,105,224,0.2)",
      background: "rgba(108,105,224,0.03)",
      padding: "6px 14px",
      fontSize: 10,
      color: "#9E9CB0",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span>🧠 {memoryCount} memories</span>
        {toneState && <span>· tone: {toneState}</span>}
        {patternCount !== undefined && patternCount > 0 && (
          <span>· {patternCount} patterns</span>
        )}
        {provider && <span>· {provider}</span>}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{ background: "none", border: "none", color: "#6C69E0", cursor: "pointer", fontSize: 10, fontWeight: 600 }}
        >
          {expanded ? "Hide" : "IDs"}
        </button>
        <button
          onClick={inspectContext}
          style={{ background: "none", border: "none", color: "#6C69E0", cursor: "pointer", fontSize: 10, fontWeight: 600 }}
        >
          Context
        </button>
        <button
          onClick={inspectBriefing}
          style={{ background: "none", border: "none", color: "#6C69E0", cursor: "pointer", fontSize: 10, fontWeight: 600 }}
        >
          Briefing
        </button>
      </div>
      {expanded && memoryIds.length > 0 && (
        <p style={{ marginTop: 4, wordBreak: "break-all", lineHeight: 1.4 }}>
          {memoryIds.join(", ")}
        </p>
      )}
      {inspect && (
        <pre style={{
          marginTop: 6, fontSize: 9, maxHeight: 160, overflow: "auto",
          background: "#FAFAFA", padding: 6, borderRadius: 6,
        }}>
          {JSON.stringify(inspect, null, 2)}
        </pre>
      )}
    </div>
  );
}
