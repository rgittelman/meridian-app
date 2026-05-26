"use client";

/**
 * QuickAddSheet — Mobile-first bottom sheet for creating tasks, reminders, and events.
 * Optimized for one-handed use and fast entry.
 *
 * IMPORTANT: No CSS `transform` is used on the sheet container.
 * Android Chrome in standalone PWA mode positions native date/time picker
 * dialogs relative to the nearest transformed ancestor. Any transform
 * (even translateY(0) from an animation fill) causes the picker's
 * action buttons to overflow off-screen on narrow viewports.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import InlineTimePicker from "./InlineTimePicker";

type ItemType = "task" | "reminder" | "event";

export interface EditTarget {
  id:        string;
  kind:      "task" | "reminder";
  title:     string;
  date?:     string;
  time?:     string;
  itemType?: ItemType;
}

interface QuickAddSheetProps {
  open:       boolean;
  onClose:    () => void;
  onCreated?: () => void;
  editTarget?: EditTarget | null;
}

const TYPE_CONFIG: Record<ItemType, { label: string; color: string; placeholder: string }> = {
  task:     { label: "Task",     color: "#6C69E0", placeholder: "What needs doing?" },
  reminder: { label: "Reminder", color: "#D4810A", placeholder: "What should you remember?" },
  event:    { label: "Event",    color: "#3D9A7A", placeholder: "What\u2019s happening?" },
};

function formatDateForInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function QuickAddSheet({ open, onClose, onCreated, editTarget }: QuickAddSheetProps) {
  const [type, setType]       = useState<ItemType>("task");
  const [title, setTitle]     = useState("");
  const [date, setDate]       = useState("");
  const [time, setTime]       = useState("");
  const [saving, setSaving]   = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isEdit = Boolean(editTarget);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(max-width: 600px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (open) {
      if (editTarget) {
        setTitle(editTarget.title);
        setDate(editTarget.date || formatDateForInput(new Date()));
        setTime(editTarget.time || "");
        setType(editTarget.itemType || (editTarget.kind === "reminder" ? "reminder" : "task"));
      } else {
        setTitle("");
        setDate(formatDateForInput(new Date()));
        setTime("");
      }
      setFeedback(null);
      setSaving(false);
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open, editTarget]);

  const handleSave = useCallback(async () => {
    const trimmed = title.trim();
    if (!trimmed || saving) return;
    setSaving(true);

    try {
      let due_at: string | null = null;
      if (date && time) {
        due_at = new Date(`${date}T${time}`).toISOString();
      }

      if (isEdit && editTarget) {
        if (editTarget.kind === "task") {
          const res = await fetch(`/api/tasks/${editTarget.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: trimmed, due_date: date || null, due_at }),
          });
          if (!res.ok) throw new Error("Failed to save");
        } else {
          await fetch(`/api/reminders/${editTarget.id}`, { method: "DELETE" });
          const res = await fetch("/api/reminders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: trimmed, scheduled_for: due_at, scheduled_date: date || null,
            }),
          });
          if (!res.ok) throw new Error("Failed to save");
        }
        setFeedback("Saved");
      } else if (type === "task" || type === "event") {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: trimmed,
            task_type: type === "event" ? "event" : "soft",
            due_date: date || null,
            due_at,
          }),
        });
        if (!res.ok) throw new Error("Failed to save");
        setFeedback(`${TYPE_CONFIG[type].label} added`);
      } else {
        const res = await fetch("/api/reminders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: trimmed,
            scheduled_for: due_at,
            scheduled_date: date || null,
          }),
        });
        if (!res.ok) throw new Error("Failed to save");
        setFeedback(`${TYPE_CONFIG[type].label} added`);
      }

      onCreated?.();
      setTimeout(() => {
        onClose();
        setFeedback(null);
      }, 600);
    } catch {
      setFeedback("Something went wrong");
      setSaving(false);
    }
  }, [title, type, date, time, saving, onClose, onCreated, isEdit, editTarget]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  if (!open || !mounted) return null;

  const cfg = TYPE_CONFIG[type];

  const content = (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 90,
          background: "rgba(0,0,0,0.25)",
          animation: "fade-up 0.15s ease both",
        }}
      />

      {/* Sheet — NO transform used (breaks Android native pickers).
          Centered with left/right:0 + margin:auto.
          Mobile: full-width. Desktop: constrained to content column. */}
      <div
        className="quick-add-sheet"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          marginLeft: "auto",
          marginRight: "auto",
          zIndex: 91,
          background: "#FFFFFF",
          borderRadius: "20px 20px 0 0",
          boxShadow: "0 -4px 32px rgba(0,0,0,0.12)",
          maxHeight: "90dvh",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          animation: "sheet-fade-in 0.2s ease both",
        }}
      >
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 6px", flexShrink: 0 }}>
          <div style={{
            width: 36, height: 4, borderRadius: 2,
            background: "rgba(0,0,0,0.10)",
          }} />
        </div>

        {/* Scrollable body */}
        <div
          className="quick-add-sheet-body"
          style={{
            paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "contain",
            flex: 1,
            minHeight: 0,
          }}
        >
          {/* Type selector */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {(["task", "reminder", "event"] as ItemType[]).map((t) => {
              const c = TYPE_CONFIG[t];
              const active = type === t;
              return (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className="tap-scale"
                  style={{
                    flex: 1, padding: "10px 0",
                    borderRadius: 12,
                    border: active ? `1.5px solid ${c.color}` : "1.5px solid rgba(0,0,0,0.08)",
                    background: active ? `${c.color}10` : "transparent",
                    color: active ? c.color : "#9E9CB0",
                    fontSize: 13, fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          {/* Title input */}
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={cfg.placeholder}
            autoComplete="off"
            autoCapitalize="sentences"
            style={{
              width: "100%", fontSize: 17, fontWeight: 500,
              color: "#1C1A2E", caretColor: cfg.color,
              padding: "14px 0", border: "none",
              borderBottom: "1px solid rgba(0,0,0,0.06)",
              outline: "none", background: "transparent",
              letterSpacing: "-0.01em",
              boxSizing: "border-box",
            }}
          />

          {/* Date row */}
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label style={{ fontSize: 11, color: "#B0AEC4", fontWeight: 500, display: "block", marginBottom: 4 }}>
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  width: "100%", fontSize: 15, color: "#1C1A2E",
                  padding: "10px 12px", borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.08)",
                  background: "rgba(0,0,0,0.02)", outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Desktop: native time input  |  Mobile: collapsed button (opens InlineTimePicker below) */}
            {!isMobile && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <label style={{ fontSize: 11, color: "#B0AEC4", fontWeight: 500, display: "block", marginBottom: 4 }}>
                  Time <span style={{ color: "#C4C2D4" }}>(optional)</span>
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  style={{
                    width: "100%", fontSize: 15, color: "#1C1A2E",
                    padding: "10px 12px", borderRadius: 10,
                    border: "1px solid rgba(0,0,0,0.08)",
                    background: "rgba(0,0,0,0.02)", outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            )}
          </div>

          {/* Mobile: custom inline time picker (avoids broken native Android picker) */}
          {isMobile && (
            <div style={{ marginTop: 10 }}>
              <label style={{ fontSize: 11, color: "#B0AEC4", fontWeight: 500, display: "block", marginBottom: 4 }}>
                Time <span style={{ color: "#C4C2D4" }}>(optional)</span>
              </label>
              <InlineTimePicker
                value={time}
                onChange={setTime}
                accentColor={cfg.color}
              />
            </div>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!title.trim() || saving}
            className="tap-scale"
            style={{
              width: "100%", marginTop: 18,
              padding: "14px 0", borderRadius: 14,
              background: title.trim() ? cfg.color : "rgba(0,0,0,0.06)",
              color: title.trim() ? "#FFFFFF" : "#C4C2D4",
              fontSize: 16, fontWeight: 600,
              border: "none", cursor: title.trim() ? "pointer" : "default",
              transition: "all 0.2s ease",
            }}
          >
            {feedback ?? (saving ? "Saving…" : isEdit ? "Save changes" : `Add ${cfg.label}`)}
          </button>
        </div>
      </div>
    </>
  );

  return createPortal(content, document.body);
}
