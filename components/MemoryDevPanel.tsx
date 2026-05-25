"use client";

/**
 * MemoryDevPanel — Temporary developer test panel for the memory loop.
 * Only rendered when NODE_ENV=development.
 */

import { useState } from "react";
import SettingsSection, { SettingsRow } from "@/components/SettingsSection";

type DebugResult = Record<string, unknown> | null;

const TEST_QUERY = "What are my priorities and goals?";

const btnStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: "#6C69E0",
  background: "rgba(108,105,224,0.08)",
  border: "1px solid rgba(108,105,224,0.15)",
  borderRadius: 20, padding: "5px 12px", cursor: "pointer",
  whiteSpace: "nowrap",
};

export default function MemoryDevPanel() {
  const [result,  setResult]  = useState<DebugResult>(null);
  const [loading, setLoading] = useState(false);
  const [query,   setQuery]   = useState(TEST_QUERY);

  if (process.env.NODE_ENV !== "development") return null;

  async function run(action: string, extra: Record<string, unknown> = {}) {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/memory/debug", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action, query, ...extra }),
      });
      const data = await res.json();
      setResult(data);
      console.log(`[memory:dev:${action}]`, data);
    } catch (err) {
      setResult({ error: String(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SettingsSection title="Memory Dev Tools">
      <SettingsRow
        label="Test query"
        value={query}
        action={
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              fontSize: 12, border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: 8, padding: "4px 8px", width: 160,
              color: "#1C1A2E", background: "#FAFAFA",
            }}
          />
        }
        border
      />
      <SettingsRow
        label="Simulate retrieval"
        value="Rank memories with scores"
        action={
          <button style={btnStyle} disabled={loading} onClick={() => run("retrieve")}>
            Run
          </button>
        }
        border
      />
      <SettingsRow
        label="Inspect context"
        value="Full active context assembly"
        action={
          <button style={btnStyle} disabled={loading} onClick={() => run("assemble")}>
            Run
          </button>
        }
        border
      />
      <SettingsRow
        label="Generate reflection"
        value="Today's daily reflection"
        action={
          <button style={btnStyle} disabled={loading} onClick={() => run("reflect")}>
            Run
          </button>
        }
        border
      />
      <SettingsRow
        label="Test ingestion"
        value="Extract from sample conversation"
        action={
          <button
            style={btnStyle}
            disabled={loading}
            onClick={() => run("ingest", {
              messages: [
                { role: "user",      content: "I want to focus on building Meridian and reducing my mental load this quarter." },
                { role: "assistant", content: "That's a clear priority. What creates the most load right now?" },
                { role: "user",      content: "Too many meetings and I never protect time for deep work in the mornings." },
              ],
            })}
          >
            Run
          </button>
        }
        border={false}
      />

      {loading && (
        <p style={{ padding: "12px 16px", fontSize: 12, color: "#C4C2D4" }}>
          Running…
        </p>
      )}

      {result && !loading && (
        <pre style={{
          margin: 0, padding: "12px 16px",
          fontSize: 10, lineHeight: 1.5,
          color: "#6B6880", background: "#FAFAFA",
          borderTop: "1px solid rgba(0,0,0,0.045)",
          overflowX: "auto", maxHeight: 280,
          whiteSpace: "pre-wrap", wordBreak: "break-word",
        }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </SettingsSection>
  );
}
