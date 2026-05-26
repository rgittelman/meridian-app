"use client";

/**
 * TodayItemsList — Real tasks, events, and reminders for the Today screen.
 * Mobile-first, one-handed use, minimal friction.
 * Swipe right = complete. Swipe left = reveal action tray.
 */

import { useState, useCallback, useRef } from "react";
import { useTodayItems } from "@/lib/hooks/use-today-items";
import QuickAddSheet from "@/components/QuickAddSheet";
import type { EditTarget } from "@/components/QuickAddSheet";
import UndoToast from "@/components/UndoToast";
import type { UndoAction } from "@/components/UndoToast";
import { haptic } from "@/lib/haptics";
import type { Task } from "@/lib/tasks/types";
import type { Reminder } from "@/lib/reminders/types";

const card: React.CSSProperties = {
  background:   "#FFFFFF",
  borderRadius: 16,
  border:       "1px solid rgba(0,0,0,0.06)",
  boxShadow:    "0 1px 2px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.04)",
  overflow:     "hidden",
};

const sectionLabel: React.CSSProperties = {
  fontSize:      11,
  fontWeight:    600,
  color:         "#B0AEC4",
  letterSpacing: "0.09em",
  marginBottom:  8,
  paddingLeft:   2,
};

// ── Formatting helpers ──────────────────────────────────────────────────────

function formatDue(task: Task): string | null {
  if (task.due_at) {
    const d = new Date(task.due_at);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  if (task.due_date) {
    const today = new Date();
    const due = new Date(task.due_date + "T00:00:00");
    const diffDays = Math.round((due.getTime() - today.setHours(0, 0, 0, 0)) / 86400000);
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
    if (diffDays <= 7) return due.toLocaleDateString("en-US", { weekday: "short" });
    return due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return null;
}

function formatReminderTime(r: Reminder): string | null {
  if (r.scheduled_for) {
    const d = new Date(r.scheduled_for);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  if (r.scheduled_date) {
    const today = new Date();
    const due = new Date(r.scheduled_date + "T00:00:00");
    const diffDays = Math.round((due.getTime() - today.setHours(0, 0, 0, 0)) / 86400000);
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    return due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return null;
}

function isOverdue(task: Task): boolean {
  if (!task.due_date) return false;
  const today = new Date().toISOString().split("T")[0];
  return task.due_date < today;
}

// ── CheckCircle ─────────────────────────────────────────────────────────────

function CheckCircle({ checked, onToggle, color = "#6C69E0", completing }: {
  checked: boolean; onToggle: () => void; color?: string; completing?: boolean;
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      aria-label={checked ? "Reopen" : "Mark complete"}
      className="tap-scale"
      style={{
        width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
        border: (checked || completing) ? "none" : `1.5px solid rgba(0,0,0,0.14)`,
        background: (checked || completing) ? color : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer",
        transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
        transform: completing ? "scale(1.15)" : "scale(1)",
      }}
    >
      {(checked || completing) && (
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"
          className={completing ? "animate-check-pop" : undefined}
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </button>
  );
}

// ── SwipeRow — swipe right to complete, swipe left to reveal actions ────────
// Velocity-aware, rubber-band damped, spring snap-back.

const SWIPE_COMMIT = 72;
const SWIPE_REVEAL = 64;
const DIR_LOCK_PX = 12;
const ACTION_TRAY_W = 96;

function rubberBand(offset: number, limit: number): number {
  const abs = Math.abs(offset);
  if (abs <= limit) return offset;
  const over = abs - limit;
  const damped = limit + over * 0.3;
  return offset > 0 ? damped : -damped;
}

function SwipeRow({ children, onSwipeRight, onEdit, onDelete }: {
  children: React.ReactNode;
  onSwipeRight?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const startX = useRef(0);
  const startY = useRef(0);
  const startTime = useRef(0);
  const [offset, setOffset] = useState(0);
  const [settled, setSettled] = useState<"closed" | "open">("closed");
  const tracking = useRef(false);
  const lockDir = useRef<"h" | "v" | null>(null);
  const lastDx = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    startX.current = t.clientX;
    startY.current = t.clientY;
    startTime.current = Date.now();
    tracking.current = true;
    lockDir.current = null;
    lastDx.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!tracking.current) return;
    const t = e.touches[0];
    const dx = t.clientX - startX.current;
    const dy = t.clientY - startY.current;

    if (!lockDir.current) {
      if (Math.abs(dx) > DIR_LOCK_PX || Math.abs(dy) > DIR_LOCK_PX) {
        lockDir.current = Math.abs(dx) > Math.abs(dy) * 1.4 ? "h" : "v";
      }
      return;
    }
    if (lockDir.current === "v") return;

    e.preventDefault();
    lastDx.current = dx;

    if (settled === "open") {
      setOffset(-ACTION_TRAY_W + rubberBand(dx, 40));
    } else {
      setOffset(rubberBand(dx, 90));
    }
  }, [settled]);

  const handleTouchEnd = useCallback(() => {
    if (!tracking.current || lockDir.current !== "h") {
      tracking.current = false;
      return;
    }
    tracking.current = false;

    const elapsed = Date.now() - startTime.current;
    const velocity = Math.abs(lastDx.current) / Math.max(elapsed, 1);
    const fast = velocity > 0.5;

    if (settled === "open") {
      if (lastDx.current > 20 || fast) {
        setSettled("closed");
        setOffset(0);
      } else {
        setOffset(-ACTION_TRAY_W);
      }
      return;
    }

    if ((offset > SWIPE_COMMIT || (fast && offset > 30)) && onSwipeRight) {
      haptic.medium();
      onSwipeRight();
    } else if (offset < -SWIPE_REVEAL || (fast && offset < -25)) {
      setSettled("open");
      setOffset(-ACTION_TRAY_W);
      return;
    }

    setOffset(0);
  }, [offset, onSwipeRight, settled]);

  const closeTray = useCallback(() => {
    setSettled("closed");
    setOffset(0);
  }, []);

  const isOpen = settled === "open";
  const dragging = tracking.current && lockDir.current === "h";
  const rightProg = Math.min(1, Math.max(0, offset / SWIPE_COMMIT));

  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      {/* Right-swipe background (complete indicator) */}
      {rightProg > 0 && (
        <div style={{
          position: "absolute", inset: 0,
          background: `rgba(61,154,122,${0.06 + rightProg * 0.1})`,
          display: "flex", alignItems: "center", paddingLeft: 20,
        }}>
          {rightProg > 0.15 && (
            <svg
              width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="#3D9A7A" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
              style={{ opacity: Math.min(1, rightProg * 1.5) }}
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
      )}

      {/* Row content — slides with touch */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging ? "none" : "transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)",
          position: "relative",
          zIndex: 1,
          background: "#FFFFFF",
        }}
      >
        {children}
      </div>

      {/* Action tray — rendered ABOVE row content so buttons always receive taps */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: ACTION_TRAY_W,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            zIndex: 3,
            background: "rgba(245,244,250,0.95)",
          }}
        >
          {onEdit && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                console.log("[SwipeRow] Edit tapped");
                closeTray();
                onEdit();
              }}
              className="tap-scale"
              style={{
                width: 38, height: 38, borderRadius: 10,
                background: "rgba(108,105,224,0.1)", border: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
                touchAction: "manipulation",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6C69E0" strokeWidth={2} strokeLinecap="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                console.log("[SwipeRow] Delete tapped");
                closeTray();
                haptic.warning();
                onDelete();
              }}
              className="tap-scale"
              style={{
                width: 38, height: 38, borderRadius: 10,
                background: "rgba(224,62,62,0.06)", border: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
                touchAction: "manipulation",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#D4483E" strokeWidth={2} strokeLinecap="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Row components ──────────────────────────────────────────────────────────

function TaskRow({ task, onComplete, onDelete, onEdit, completing }: {
  task: Task; onComplete: (id: string) => void; onDelete: (id: string) => void;
  onEdit?: (task: Task) => void; completing?: boolean;
}) {
  const due = formatDue(task);
  const overdue = isOverdue(task);
  const isAI = task.source_type === "conversation";
  return (
    <SwipeRow
      onSwipeRight={() => onComplete(task.id)}
      onEdit={onEdit ? () => onEdit(task) : undefined}
      onDelete={() => onDelete(task.id)}
    >
      <div
        onClick={() => onEdit?.(task)}
        className={completing ? "animate-row-complete" : undefined}
        style={{
          padding: "13px 16px",
          display: "flex", alignItems: "center", gap: 12,
          cursor: onEdit ? "pointer" : undefined,
        }}
      >
        <CheckCircle checked={false} completing={completing} onToggle={() => onComplete(task.id)} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, color: "#1C1A2E", lineHeight: 1.35, margin: 0 }}>
            {task.title}
          </p>
          {(task.description || isAI) && (
            <p style={{ fontSize: 11, color: "#C4C2D4", margin: "2px 0 0", lineHeight: 1.3 }}>
              {task.description || (isAI ? "From conversation" : "")}
            </p>
          )}
        </div>
        {due && (
          <span style={{
            fontSize: 11, fontWeight: 500, flexShrink: 0,
            color: overdue ? "#D4810A" : "#C4C2D4",
          }}>
            {due}
          </span>
        )}
      </div>
    </SwipeRow>
  );
}

function EventRow({ event, onComplete, onDelete, onEdit, completing }: {
  event: Task; onComplete: (id: string) => void; onDelete: (id: string) => void;
  onEdit?: (task: Task) => void; completing?: boolean;
}) {
  const due = formatDue(event);
  return (
    <SwipeRow
      onSwipeRight={() => onComplete(event.id)}
      onEdit={onEdit ? () => onEdit(event) : undefined}
      onDelete={() => onDelete(event.id)}
    >
      <div
        onClick={() => onEdit?.(event)}
        className={completing ? "animate-row-complete" : undefined}
        style={{
          padding: "13px 16px",
          display: "flex", alignItems: "center", gap: 12,
          cursor: onEdit ? "pointer" : undefined,
        }}
      >
        <div style={{
          width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
          background: "#3D9A7A", opacity: 0.7,
        }} />
        <p style={{ flex: 1, fontSize: 15, color: "#1C1A2E", lineHeight: 1.35, margin: 0 }}>
          {event.title}
        </p>
        {due && (
          <span style={{ fontSize: 11, fontWeight: 500, color: "#3D9A7A", flexShrink: 0 }}>
            {due}
          </span>
        )}
        <CheckCircle checked={false} completing={completing} onToggle={() => onComplete(event.id)} color="#3D9A7A" />
      </div>
    </SwipeRow>
  );
}

function ReminderRow({ reminder, onDismiss, onDelete, onEdit }: {
  reminder: Reminder; onDismiss: (id: string) => void; onDelete: (id: string) => void;
  onEdit?: (r: Reminder) => void;
}) {
  const when = formatReminderTime(reminder);
  const isManual = reminder.reminder_type === "manual";
  return (
    <SwipeRow
      onSwipeRight={() => onDismiss(reminder.id)}
      onEdit={onEdit ? () => onEdit(reminder) : undefined}
      onDelete={() => onDelete(reminder.id)}
    >
      <div
        onClick={() => onEdit?.(reminder)}
        style={{
          padding: "13px 16px",
          display: "flex", alignItems: "center", gap: 12,
          cursor: onEdit ? "pointer" : undefined,
        }}
      >
        <div style={{
          width: 8, height: 8, borderRadius: 2, flexShrink: 0,
          background: "#D4810A", opacity: 0.7,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, color: "#1C1A2E", lineHeight: 1.35, margin: 0 }}>
            {reminder.title}
          </p>
          {(reminder.body || !isManual) && (
            <p style={{ fontSize: 11, color: "#C4C2D4", margin: "2px 0 0", lineHeight: 1.3 }}>
              {reminder.body || (reminder.why_shown ?? "From Meridian")}
            </p>
          )}
        </div>
        {when && (
          <span style={{ fontSize: 11, fontWeight: 500, color: "#D4810A", flexShrink: 0 }}>
            {when}
          </span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDismiss(reminder.id); }}
          className="tap-scale"
          style={{
            background: "rgba(61,154,122,0.06)", border: "none", cursor: "pointer",
            fontSize: 12, fontWeight: 600, color: "#3D9A7A", padding: "6px 12px",
            borderRadius: 8, minHeight: 32,
          }}
        >
          Done
        </button>
      </div>
    </SwipeRow>
  );
}

function CompletedRow({ task, onReopen }: { task: Task; onReopen: (id: string) => void }) {
  return (
    <div
      onClick={() => onReopen(task.id)}
      style={{
        padding: "10px 16px",
        display: "flex", alignItems: "center", gap: 12,
        cursor: "pointer",
        transition: "background 0.15s ease",
      }}
    >
      <CheckCircle checked={true} onToggle={() => onReopen(task.id)} />
      <p style={{
        flex: 1, fontSize: 14, color: "#9E9CB0", lineHeight: 1.35, margin: 0,
        textDecoration: "line-through",
      }}>
        {task.title}
      </p>
      <span style={{
        fontSize: 11, fontWeight: 600, color: "#6C69E0",
        background: "rgba(108,105,224,0.06)", borderRadius: 6,
        padding: "3px 8px", flexShrink: 0,
      }}>
        Restore
      </span>
    </div>
  );
}

function SkeletonList() {
  const bar: React.CSSProperties = {
    background: "rgba(108,105,224,0.08)", borderRadius: 8,
    animation: "pulse 1.4s ease-in-out infinite",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ ...bar, height: 48 }} />
      <div style={{ ...bar, height: 48 }} />
      <div style={{ ...bar, height: 48 }} />
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }`}</style>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

interface Props {
  userName: string;
}

function greeting(name: string): string {
  const h = new Date().getHours();
  if (h < 5)  return `Still up, ${name}?`;
  if (h < 12) return `Good morning, ${name}.`;
  if (h < 17) return `Good afternoon, ${name}.`;
  if (h < 21) return `Good evening, ${name}.`;
  return `Winding down, ${name}.`;
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
}

export default function TodayItemsList({ userName }: Props) {
  const {
    items, loading, refresh,
    completeTask, reopenTask, deleteTask, dismissReminder, deleteReminder,
  } = useTodayItems();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());

  const handleComplete = useCallback((id: string) => {
    const task = [...items.tasks, ...items.events].find((t) => t.id === id);
    haptic.medium();

    setCompletingIds((prev) => new Set(prev).add(id));

    setTimeout(() => {
      completeTask(id);
      setCompletingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }, 400);

    if (task) {
      setUndoAction({
        id,
        label: `"${task.title.slice(0, 30)}" completed`,
        onUndo: () => { reopenTask(id); setUndoAction(null); },
      });
    }
  }, [items.tasks, items.events, completeTask, reopenTask]);

  const handleDismiss = useCallback((id: string) => {
    const reminder = items.reminders.find((r) => r.id === id);
    haptic.medium();
    dismissReminder(id);
    if (reminder) {
      setUndoAction({
        id,
        label: `"${reminder.title.slice(0, 30)}" dismissed`,
        onUndo: () => { refresh(); setUndoAction(null); },
      });
    }
  }, [items.reminders, dismissReminder, refresh]);

  const handleReopen = useCallback((id: string) => {
    const task = items.completed.find((t) => t.id === id);
    haptic.light();
    reopenTask(id);
    if (task) {
      setUndoAction({
        id,
        label: `"${task.title.slice(0, 30)}" restored`,
        onUndo: () => { completeTask(id); setUndoAction(null); },
      });
    }
  }, [items.completed, reopenTask, completeTask]);

  const openEdit = useCallback((task: Task) => {
    haptic.light();
    const dateStr = task.due_date || "";
    let timeStr = "";
    if (task.due_at) {
      const d = new Date(task.due_at);
      timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
    setEditTarget({
      id: task.id,
      kind: "task",
      title: task.title,
      date: dateStr,
      time: timeStr,
      itemType: task.task_type === "event" ? "event" : "task",
    });
    setSheetOpen(true);
  }, []);

  const openEditReminder = useCallback((r: Reminder) => {
    haptic.light();
    let dateStr = r.scheduled_date || "";
    let timeStr = "";
    if (r.scheduled_for) {
      const d = new Date(r.scheduled_for);
      if (!dateStr) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        dateStr = `${y}-${m}-${day}`;
      }
      timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
    setEditTarget({
      id: r.id,
      kind: "reminder",
      title: r.title,
      date: dateStr,
      time: timeStr,
      itemType: "reminder",
    });
    setSheetOpen(true);
  }, []);

  const handleCreate = useCallback(() => {
    haptic.success();
    refresh();
  }, [refresh]);

  const name = userName || "there";
  const totalOpen = items.tasks.length + items.events.length + items.reminders.length;

  if (loading) return <SkeletonList />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Greeting */}
      <div style={{
        background: "rgba(255,255,255,0.72)",
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(108,105,224,0.08)",
        borderRadius: 16, padding: "14px 16px",
        boxShadow: "0 1px 1px rgba(0,0,0,0.02), 0 2px 12px rgba(108,105,224,0.04)",
      }}>
        <p style={{ fontSize: 10, fontWeight: 500, color: "#C4C2D4", letterSpacing: "0.1em", marginBottom: 5 }}>
          {formatDate().toUpperCase()}
        </p>
        <p style={{ fontSize: 17, fontWeight: 600, color: "#1C1A2E", letterSpacing: "-0.02em", lineHeight: 1.3, marginBottom: 4 }}>
          {greeting(name)}
        </p>
        <p style={{ fontSize: 13, color: "#9E9CB0", lineHeight: 1.45 }}>
          {totalOpen === 0
            ? "Clear space ahead."
            : `${totalOpen} ${totalOpen === 1 ? "item" : "items"} on your plate.`}
        </p>
      </div>

      {/* Quick add button — desktop/tablet only */}
      <button
        onClick={() => { setEditTarget(null); setSheetOpen(true); }}
        className="tap-scale desktop-only-add"
        style={{
          ...card,
          padding: "14px 16px",
          alignItems: "center", gap: 10,
          cursor: "pointer", border: "1px solid rgba(108,105,224,0.12)",
          background: "rgba(108,105,224,0.03)",
        }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: "#6C69E0", display: "flex",
          alignItems: "center", justifyContent: "center",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
        <span style={{ fontSize: 15, color: "#6C69E0", fontWeight: 500 }}>
          Add task, reminder, or event
        </span>
      </button>

      {/* Events */}
      {items.events.length > 0 && (
        <section>
          <p style={sectionLabel}>EVENTS</p>
          <div style={card}>
            {items.events.map((event, i) => (
              <div key={event.id} style={{
                borderBottom: i < items.events.length - 1 ? "1px solid rgba(0,0,0,0.04)" : undefined,
              }}>
                <EventRow event={event} onComplete={handleComplete} onDelete={deleteTask} onEdit={openEdit} completing={completingIds.has(event.id)} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tasks */}
      {items.tasks.length > 0 && (
        <section>
          <p style={sectionLabel}>TASKS</p>
          <div style={card}>
            {items.tasks.map((task, i) => (
              <div key={task.id} style={{
                borderBottom: i < items.tasks.length - 1 ? "1px solid rgba(0,0,0,0.04)" : undefined,
              }}>
                <TaskRow task={task} onComplete={handleComplete} onDelete={deleteTask} onEdit={openEdit} completing={completingIds.has(task.id)} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Reminders */}
      {items.reminders.length > 0 && (
        <section>
          <p style={sectionLabel}>REMINDERS</p>
          <div style={card}>
            {items.reminders.map((r, i) => (
              <div key={r.id} style={{
                borderBottom: i < items.reminders.length - 1 ? "1px solid rgba(0,0,0,0.04)" : undefined,
              }}>
                <ReminderRow reminder={r} onDismiss={handleDismiss} onDelete={deleteReminder} onEdit={openEditReminder} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {totalOpen === 0 && items.completed.length === 0 && (
        <div style={{
          ...card,
          padding: "24px 18px",
          textAlign: "center",
          background: "rgba(61,154,122,0.03)",
          border: "1px solid rgba(61,154,122,0.08)",
        }}>
          <p style={{ fontSize: 14, color: "#3D9A7A", margin: 0 }}>
            Nothing here yet. Tap the + button to add something.
          </p>
        </div>
      )}

      {/* Completed */}
      {items.completed.length > 0 && (
        <section>
          <p style={sectionLabel}>COMPLETED TODAY</p>
          <div style={card}>
            {items.completed.map((task, i) => (
              <div key={task.id} style={{
                borderBottom: i < items.completed.length - 1 ? "1px solid rgba(0,0,0,0.04)" : undefined,
              }}>
                <CompletedRow task={task} onReopen={handleReopen} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quick-add / edit sheet */}
      <QuickAddSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditTarget(null); }}
        onCreated={handleCreate}
        editTarget={editTarget}
      />

      {/* Undo toast */}
      <UndoToast action={undoAction} />

      {/* Floating quick-add FAB — mobile only */}
      {!sheetOpen && (
        <button
          onClick={() => { setEditTarget(null); haptic.light(); setSheetOpen(true); }}
          aria-label="Quick add"
          className="tap-scale mobile-only-fab"
          style={{
            position: "fixed",
            bottom: "calc(60px + env(safe-area-inset-bottom, 0px) + 78px)",
            right: 18,
            zIndex: 45,
            width: 52, height: 52,
            borderRadius: "50%",
            background: "#6C69E0",
            border: "none",
            boxShadow: "0 4px 16px rgba(108,105,224,0.35), 0 2px 4px rgba(0,0,0,0.08)",
            alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      )}
    </div>
  );
}
