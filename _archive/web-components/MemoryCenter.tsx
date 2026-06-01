"use client";

/**
 * MemoryCenter — Settings Memory Center UI.
 *
 * View, manage, and configure Meridian's memory layer.
 * Preserves the existing Meridian light visual system.
 */

import { useState, useEffect, useCallback } from "react";
import SettingsSection, { SettingsRow, SettingsToggle } from "@/components/SettingsSection";
import {
  MEMORY_CATEGORIES,
  type Memory,
  type MemoryCategory,
  type UserMemoryPreferences,
} from "@/lib/memory/types";
import {
  MEMORY_CATEGORY_LABELS,
  MEMORY_CATEGORY_DESCRIPTIONS,
} from "@/lib/memory/constants";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

const CATEGORY_COLORS: Record<MemoryCategory, { bg: string; color: string }> = {
  preferences:         { bg: "#EEEDFB", color: "#6C69E0" },
  routines:            { bg: "#E6F5F0", color: "#3A9A7A" },
  recurring_goals:     { bg: "#FFF5E6", color: "#D4810A" },
  emotional_patterns:  { bg: "#FFE8F3", color: "#C4597A" },
  health_patterns:     { bg: "#E6F5F0", color: "#3A9A7A" },
  financial_behaviors: { bg: "#FFF5E6", color: "#D4810A" },
  relationships:       { bg: "#FFE8F3", color: "#C4597A" },
  work_context:        { bg: "#EEEDFB", color: "#6C69E0" },
  priorities:          { bg: "#EEEDFB", color: "#6C69E0" },
  recurring_stressors: { bg: "#FFF0F0", color: "#C0392B" },
  wins_progress:       { bg: "#E6F5F0", color: "#3A9A7A" },
  unfinished_tasks:    { bg: "#F5F5F5", color: "#6B7280" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function CategoryPill({ category }: { category: MemoryCategory }) {
  const { bg, color } = CATEGORY_COLORS[category];
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, letterSpacing: "0.06em",
      color, background: bg, borderRadius: 20,
      padding: "3px 8px", whiteSpace: "nowrap",
    }}>
      {MEMORY_CATEGORY_LABELS[category].toUpperCase()}
    </span>
  );
}

function MemoryCard({
  memory,
  onDelete,
  onExpand,
  expanded,
}: {
  memory:   Memory;
  onDelete: (id: string) => void;
  onExpand: (id: string) => void;
  expanded: boolean;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await onDelete(memory.id);
    setDeleting(false);
  }

  return (
    <div style={{
      padding: "14px 16px",
      borderBottom: "1px solid rgba(0,0,0,0.045)",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
            <CategoryPill category={memory.category} />
            <span style={{ fontSize: 11, color: "#C4C2D4" }}>
              {formatDate(memory.last_reinforced_at)}
            </span>
          </div>
          <p style={{
            fontSize: 14, fontWeight: 600, color: "#1C1A2E",
            letterSpacing: "-0.01em", marginBottom: 4,
          }}>
            {memory.title}
          </p>
          <p style={{ fontSize: 13, color: "#9E9CB0", lineHeight: 1.45 }}>
            {memory.summary ?? memory.content}
          </p>

          {expanded && memory.why_remembered && (
            <div style={{
              marginTop: 10, padding: "10px 12px",
              background: "rgba(108,105,224,0.06)",
              borderRadius: 10,
              border: "1px solid rgba(108,105,224,0.12)",
            }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#6C69E0", letterSpacing: "0.05em", marginBottom: 4 }}>
                WHY THIS IS REMEMBERED
              </p>
              <p style={{ fontSize: 12, color: "#6B6880", lineHeight: 1.5 }}>
                {memory.why_remembered}
              </p>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
          <button
            onClick={() => onExpand(memory.id)}
            style={{
              fontSize: 11, fontWeight: 600, color: "#6C69E0",
              background: "rgba(108,105,224,0.08)",
              border: "1px solid rgba(108,105,224,0.15)",
              borderRadius: 20, padding: "4px 10px", cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {expanded ? "Less" : "Why?"}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              fontSize: 11, fontWeight: 600,
              color: deleting ? "#C4C2D4" : "#9E9CB0",
              background: "rgba(0,0,0,0.04)",
              border: "1px solid rgba(0,0,0,0.06)",
              borderRadius: 20, padding: "4px 10px", cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {deleting ? "…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CategoryOptOutRow({
  category,
  disabled,
  onToggle,
}: {
  category: MemoryCategory;
  disabled: boolean;
  onToggle:  (cat: MemoryCategory) => void;
}) {
  return (
    <SettingsRow
      label={MEMORY_CATEGORY_LABELS[category]}
      value={MEMORY_CATEGORY_DESCRIPTIONS[category]}
      action={
        <SettingsToggle
          enabled={!disabled}
          onToggle={() => onToggle(category)}
        />
      }
      border
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MemoryCenter() {
  const [memories,   setMemories]   = useState<Memory[]>([]);
  const [prefs,      setPrefs]      = useState<UserMemoryPreferences | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [expanded,   setExpanded]   = useState<string | null>(null);
  const [view,       setView]       = useState<"memories" | "categories">("memories");
  const [filter,     setFilter]     = useState<MemoryCategory | "all">("all");
  const [wipeConfirm,setWipeConfirm]= useState(false);
  const [exporting,  setExporting]  = useState(false);
  const [feedback,   setFeedback]   = useState<{ text: string; type: "ok" | "err" } | null>(null);

  function showFeedback(text: string, type: "ok" | "err" = "ok") {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 3000);
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [memRes, prefRes] = await Promise.all([
        fetch("/api/memory"),
        fetch("/api/memory/categories"),
      ]);
      if (memRes.ok)  setMemories((await memRes.json()).memories ?? []);
      if (prefRes.ok) setPrefs(await prefRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    const res = await fetch(`/api/memory/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMemories((prev) => prev.filter((m) => m.id !== id));
      showFeedback("Memory deleted");
    } else {
      showFeedback("Failed to delete memory", "err");
    }
  }

  async function updatePrefs(updates: Partial<UserMemoryPreferences>) {
    const res = await fetch("/api/memory/categories", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(updates),
    });
    if (res.ok) {
      setPrefs(await res.json());
      showFeedback("Preferences updated");
    } else {
      showFeedback("Failed to update preferences", "err");
    }
  }

  async function handleWipe() {
    if (!wipeConfirm) { setWipeConfirm(true); return; }
    const res = await fetch("/api/memory/wipe", { method: "POST" });
    if (res.ok) {
      setMemories([]);
      showFeedback("All memories cleared");
    } else {
      showFeedback("Failed to clear memories", "err");
    }
    setWipeConfirm(false);
    await load();
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/memory/export");
      if (!res.ok) { showFeedback("Export failed", "err"); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `meridian-memories-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showFeedback("Memories exported");
    } finally {
      setExporting(false);
    }
  }

  function toggleCategory(cat: MemoryCategory) {
    if (!prefs) return;
    const disabled = prefs.disabled_memory_categories.includes(cat)
      ? prefs.disabled_memory_categories.filter((c) => c !== cat)
      : [...prefs.disabled_memory_categories, cat];
    updatePrefs({ disabled_memory_categories: disabled });
  }

  const filtered = filter === "all"
    ? memories
    : memories.filter((m) => m.category === filter);

  const pillStyle = (active: boolean): React.CSSProperties => ({
    fontSize: 12, fontWeight: 500, cursor: "pointer",
    padding: "5px 12px", borderRadius: 20, whiteSpace: "nowrap",
    border: active ? "1.5px solid rgba(108,105,224,0.4)" : "1.5px solid rgba(0,0,0,0.08)",
    background: active ? "rgba(108,105,224,0.08)" : "#FFFFFF",
    color: active ? "#6C69E0" : "#9E9CB0",
  });

  return (
    <>
      {/* ── Feedback toast ──────────────────────────────────────── */}
      {feedback && (
        <div style={{
          position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)",
          zIndex: 1000, padding: "10px 20px", borderRadius: 12,
          background: feedback.type === "ok" ? "#1C1A2E" : "#E03E3E",
          color: "#FFFFFF", fontSize: 13, fontWeight: 500,
          boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
          animation: "fade-up 0.2s ease both",
        }}>
          {feedback.text}
        </div>
      )}
      {/* ── Memory controls ──────────────────────────────────────── */}
      <SettingsSection title="Meridian Memory">
        <SettingsRow
          label="Memory enabled"
          value="Meridian remembers your goals and patterns."
          action={
            <SettingsToggle
              enabled={prefs?.memory_enabled ?? true}
              onToggle={() => updatePrefs({ memory_enabled: !(prefs?.memory_enabled ?? true) })}
            />
          }
          border
        />
        <SettingsRow
          label="Personalization"
          value="Adapts tone and insights to your style."
          action={
            <SettingsToggle
              enabled={prefs?.personalization_enabled ?? true}
              onToggle={() => updatePrefs({ personalization_enabled: !(prefs?.personalization_enabled ?? true) })}
            />
          }
          border
        />
        <SettingsRow
          label="Memory Center"
          value={`${memories.length} memories stored`}
          action={
            <button
              onClick={() => setView(view === "memories" ? "categories" : "memories")}
              style={{
                fontSize: 12, fontWeight: 600, color: "#6C69E0",
                background: "rgba(108,105,224,0.08)",
                border: "1px solid rgba(108,105,224,0.15)",
                borderRadius: 20, padding: "5px 14px", cursor: "pointer",
              }}
            >
              {view === "memories" ? "Categories" : "View all"}
            </button>
          }
          border
        />
        <SettingsRow
          label="Export memories"
          action={
            <button
              onClick={handleExport}
              disabled={exporting || memories.length === 0}
              style={{
                fontSize: 12, fontWeight: 600, color: "#6C69E0",
                background: "rgba(108,105,224,0.08)",
                border: "1px solid rgba(108,105,224,0.15)",
                borderRadius: 20, padding: "5px 14px", cursor: "pointer",
                opacity: memories.length === 0 ? 0.4 : 1,
              }}
            >
              {exporting ? "Exporting…" : "Export"}
            </button>
          }
          border
        />
        <SettingsRow
          label={wipeConfirm ? "Tap again to confirm" : "Clear all memory"}
          danger={wipeConfirm}
          action={
            <button
              onClick={handleWipe}
              style={{
                fontSize: 12, fontWeight: 600,
                color: wipeConfirm ? "#FFFFFF" : "#9E9CB0",
                background: wipeConfirm ? "#E03E3E" : "rgba(0,0,0,0.04)",
                border: `1px solid ${wipeConfirm ? "#E03E3E" : "rgba(0,0,0,0.06)"}`,
                borderRadius: 20, padding: "5px 14px", cursor: "pointer",
              }}
            >
              {wipeConfirm ? "Confirm" : "Clear"}
            </button>
          }
          border={false}
        />
      </SettingsSection>

      {/* ── Category opt-outs ─────────────────────────────────────── */}
      {view === "categories" && (
        <SettingsSection title="Memory Categories">
          {MEMORY_CATEGORIES.map((cat) => (
            <CategoryOptOutRow
              key={cat}
              category={cat}
              disabled={prefs?.disabled_memory_categories.includes(cat) ?? false}
              onToggle={toggleCategory}
            />
          ))}
        </SettingsSection>
      )}

      {/* ── Memory list ─────────────────────────────────────────────── */}
      {view === "memories" && (
        <section style={{ marginBottom: 32 }}>
          <p style={{
            fontSize: 11, fontWeight: 600, color: "#B0AEC4",
            letterSpacing: "0.09em", marginBottom: 10, paddingLeft: 2,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span>YOUR MEMORIES</span>
            <button
              onClick={load}
              disabled={loading}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: 11, fontWeight: 600, color: "#6C69E0",
                opacity: loading ? 0.4 : 1,
              }}
            >
              Refresh
            </button>
          </p>

          {/* Category filter pills */}
          <div style={{
            display: "flex", gap: 6, overflowX: "auto",
            paddingBottom: 10, marginBottom: 4,
            scrollbarWidth: "none",
          }}>
            <button style={pillStyle(filter === "all")} onClick={() => setFilter("all")}>
              All ({memories.length})
            </button>
            {MEMORY_CATEGORIES.filter((cat) =>
              memories.some((m) => m.category === cat),
            ).map((cat) => (
              <button key={cat} style={pillStyle(filter === cat)} onClick={() => setFilter(cat)}>
                {MEMORY_CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          <div style={{
            background: "#FFFFFF", borderRadius: 18,
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.04)",
            overflow: "hidden",
          }}>
            {loading ? (
              <p style={{ padding: "24px 16px", fontSize: 13, color: "#C4C2D4", textAlign: "center" }}>
                Loading memories…
              </p>
            ) : filtered.length === 0 ? (
              <div style={{ padding: "28px 20px", textAlign: "center" }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: "#64627A", lineHeight: 1.5 }}>
                  No memories yet. They&apos;ll appear as conversations develop.
                </p>
              </div>
            ) : (
              filtered.map((memory, i) => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  onDelete={handleDelete}
                  onExpand={(id) => setExpanded(expanded === id ? null : id)}
                  expanded={expanded === memory.id}
                />
              ))
            )}
          </div>
        </section>
      )}
    </>
  );
}
