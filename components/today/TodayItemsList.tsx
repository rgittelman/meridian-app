"use client";

/**
 * TodayItemsList — Real tasks, events, and reminders for the Today screen.
 * Mobile-first, one-handed use, minimal friction.
 */

import { useState, useCallback } from "react";
import { useTodayItems } from "@/lib/hooks/use-today-items";
import QuickAddSheet from "@/components/QuickAddSheet";
import type { EditTarget } from "@/components/QuickAddSheet";
import UndoToast from "@/components/UndoToast";
import type { UndoAction } from "@/components/UndoToast";
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

function CheckCircle({ checked, onToggle, color = "#6C69E0" }: {
  checked: boolean; onToggle: () => void; color?: string;
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      aria-label={checked ? "Reopen" : "Mark complete"}
      className="tap-scale"
      style={{
        width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
        border: checked ? "none" : `1.5px solid rgba(0,0,0,0.14)`,
        background: checked ? color : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", transition: "all 0.15s ease",
      }}
    >
      {checked && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </button>
  );
}

function SwipeDelete({ onDelete, children }: { onDelete: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "relative" }}>
      {children}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        aria-label="Delete"
        className="tap-scale"
        style={{
          position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
          width: 28, height: 28, borderRadius: "50%",
          background: "rgba(224,62,62,0.08)", border: "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", opacity: 0.5,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#E03E3E" strokeWidth={2} strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

function TaskRow({ task, onComplete, onDelete, onEdit }: {
  task: Task; onComplete: (id: string) => void; onDelete: (id: string) => void; onEdit?: (task: Task) => void;
}) {
  const due = formatDue(task);
  const overdue = isOverdue(task);
  const isAI = task.source_type === "conversation";
  return (
    <SwipeDelete onDelete={() => onDelete(task.id)}>
      <div
        onClick={() => onEdit?.(task)}
        style={{
          padding: "13px 44px 13px 16px",
          display: "flex", alignItems: "center", gap: 12,
          cursor: onEdit ? "pointer" : undefined,
        }}
      >
        <CheckCircle checked={false} onToggle={() => onComplete(task.id)} />
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
    </SwipeDelete>
  );
}

function EventRow({ event, onComplete, onDelete, onEdit }: {
  event: Task; onComplete: (id: string) => void; onDelete: (id: string) => void; onEdit?: (task: Task) => void;
}) {
  const due = formatDue(event);
  return (
    <SwipeDelete onDelete={() => onDelete(event.id)}>
      <div
        onClick={() => onEdit?.(event)}
        style={{
          padding: "13px 44px 13px 16px",
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
        <CheckCircle checked={false} onToggle={() => onComplete(event.id)} color="#3D9A7A" />
      </div>
    </SwipeDelete>
  );
}

function ReminderRow({ reminder, onDismiss, onDelete, onEdit }: {
  reminder: Reminder; onDismiss: (id: string) => void; onDelete: (id: string) => void; onEdit?: (r: Reminder) => void;
}) {
  const when = formatReminderTime(reminder);
  const isManual = reminder.reminder_type === "manual";
  return (
    <SwipeDelete onDelete={() => onDelete(reminder.id)}>
      <div
        onClick={() => onEdit?.(reminder)}
        style={{
          padding: "13px 44px 13px 16px",
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
            background: "none", border: "none", cursor: "pointer",
            fontSize: 11, fontWeight: 600, color: "#3D9A7A", padding: "6px 10px",
            minHeight: 32,
          }}
        >
          Done
        </button>
      </div>
    </SwipeDelete>
  );
}

function CompletedRow({ task, onReopen }: { task: Task; onReopen: (id: string) => void }) {
  return (
    <div
      onClick={() => onReopen(task.id)}
      style={{
        padding: "10px 16px",
        display: "flex", alignItems: "center", gap: 12,
        opacity: 0.5,
        cursor: "pointer",
      }}
    >
      <CheckCircle checked={true} onToggle={() => onReopen(task.id)} />
      <p style={{
        flex: 1, fontSize: 14, color: "#9E9CB0", lineHeight: 1.35, margin: 0,
        textDecoration: "line-through",
      }}>
        {task.title}
      </p>
      <span style={{ fontSize: 11, color: "#C4C2D4", flexShrink: 0 }}>Restore</span>
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

  const handleComplete = useCallback((id: string) => {
    const task = [...items.tasks, ...items.events].find((t) => t.id === id);
    completeTask(id);
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

      {/* Quick add button — desktop/tablet only (hidden on mobile where FAB is used) */}
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
                <EventRow event={event} onComplete={handleComplete} onDelete={deleteTask} onEdit={openEdit} />
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
                <TaskRow task={task} onComplete={handleComplete} onDelete={deleteTask} onEdit={openEdit} />
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
            Nothing here yet. Tap the button above to add something.
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
        onCreated={refresh}
        editTarget={editTarget}
      />

      {/* Undo toast */}
      <UndoToast action={undoAction} />

      {/* Floating quick-add FAB — mobile only (hidden on desktop where inline card is used) */}
      {!sheetOpen && (
        <button
          onClick={() => { setEditTarget(null); setSheetOpen(true); }}
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
