"use client";

/**
 * TodayItemsList — The Today screen.
 *
 * "What matters right now?" — glanceable, calm, premium.
 * Uses Meridian design system tokens and Framer Motion throughout.
 */

import { useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTodayItems } from "@/lib/hooks/use-today-items";
import QuickAddSheet from "@/components/QuickAddSheet";
import type { EditTarget } from "@/components/QuickAddSheet";
import UndoToast from "@/components/UndoToast";
import type { UndoAction } from "@/components/UndoToast";
import { haptic } from "@/lib/haptics";
import type { Task } from "@/lib/tasks/types";
import type { Reminder } from "@/lib/reminders/types";
import {
  space, color, shadow, radius, motion as m,
  textStyle, kindColor, bucketStyle,
} from "@/lib/design/tokens";
import {
  Text, Surface, Section, CheckCircle, KindDot, PillButton, Backdrop,
} from "@/lib/design/primitives";

// ── Delete confirmation ──────────────────────────────────────────────────────

interface DeleteConfirm {
  id:    string;
  kind:  "task" | "reminder";
  title: string;
}

function ConfirmDeleteDialog({ confirm, onCancel, onDelete }: {
  confirm: DeleteConfirm;
  onCancel: () => void;
  onDelete: () => void;
}) {
  return createPortal(
    <AnimatePresence>
      <Backdrop onClose={onCancel} />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={m.spring.gentle}
        style={{
          position: "fixed",
          bottom: `calc(env(safe-area-inset-bottom, 0px) + ${space[6]}px)`,
          left: space[4], right: space[4],
          zIndex: 201,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div style={{
          background: color.surface,
          borderRadius: radius.xl,
          padding: `${space[5]}px ${space[5]}px ${space[4]}px`,
          width: "100%",
          maxWidth: 340,
          boxShadow: shadow.overlay,
        }}>
          <Text as="p" style="heading" color={color.ink} css={{ marginBottom: space[1] }}>
            Delete this?
          </Text>
          <Text as="p" style="callout" color={color.secondary} css={{ marginBottom: space[1] }}>
            &ldquo;{confirm.title.slice(0, 50)}&rdquo;
          </Text>
          <Text as="p" style="caption" color={color.ghost} css={{ marginBottom: space[5] }}>
            This can&apos;t be undone.
          </Text>
          <div style={{ display: "flex", gap: space[3] }}>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={onCancel}
              style={{
                flex: 1, padding: `${space[3]}px 0`, borderRadius: radius.md,
                border: `1px solid ${color.border}`, background: color.surface,
                ...textStyle("callout"), fontWeight: 500, color: color.secondary,
                cursor: "pointer",
              }}
            >
              Cancel
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={onDelete}
              style={{
                flex: 1, padding: `${space[3]}px 0`, borderRadius: radius.md,
                border: "none", background: color.destructive,
                ...textStyle("callout"), fontWeight: 600, color: "#FFFFFF",
                cursor: "pointer",
              }}
            >
              Delete
            </motion.button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

// ── Formatting helpers ──────────────────────────────────────────────────────

function formatHHMM(hhmm: string): string | null {
  const parts = hhmm.split(":");
  if (parts.length < 2) return null;
  let h = parseInt(parts[0], 10);
  const mn = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(mn)) return null;
  const ampm = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${String(mn).padStart(2, "0")} ${ampm}`;
}

function diffDaysFromToday(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr + "T00:00:00");
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

type DateBucket = "overdue" | "today" | "tomorrow" | "this_week" | "later" | "no_date";

function getDateBucket(dateStr: string | null): DateBucket {
  if (!dateStr) return "no_date";
  const diff = diffDaysFromToday(dateStr);
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff <= 7) return "this_week";
  return "later";
}

const BUCKET_ORDER: DateBucket[] = ["overdue", "today", "tomorrow", "this_week", "later", "no_date"];

const BUCKET_LABELS: Record<DateBucket, string> = {
  overdue: "Overdue",
  today: "Today",
  tomorrow: "Tomorrow",
  this_week: "This week",
  later: "Later",
  no_date: "Anytime",
};

function getItemTimeOnly(item: TodayItem): string | null {
  const meta = (item.metadata ?? {}) as Record<string, unknown>;
  if (typeof meta.display_time === "string") return formatHHMM(meta.display_time);
  if (item.kind === "reminder") {
    const r = item as unknown as { scheduled_for?: string | null };
    if (r.scheduled_for) {
      const d = new Date(r.scheduled_for);
      if (!isNaN(d.getTime())) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    }
  }
  if (item.kind === "task" || item.kind === "event") {
    const t = item as unknown as { due_at?: string | null };
    if (t.due_at) {
      const d = new Date(t.due_at);
      if (!isNaN(d.getTime())) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    }
  }
  return null;
}

function getItemTimeContextual(item: TodayItem): string | null {
  const dateStr = item.dateStr;
  const time = getItemTimeOnly(item);
  if (!dateStr && !time) return null;

  let dateLabel = "";
  if (dateStr) {
    const diff = diffDaysFromToday(dateStr);
    if (diff < 0) dateLabel = `${Math.abs(diff)}d overdue`;
    else if (diff === 0) dateLabel = "Today";
    else if (diff === 1) dateLabel = "Tomorrow";
    else if (diff <= 7) {
      const d = new Date(dateStr + "T00:00:00");
      dateLabel = d.toLocaleDateString("en-US", { weekday: "short" });
    } else {
      const d = new Date(dateStr + "T00:00:00");
      dateLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
  }

  if (dateLabel && time) return `${dateLabel} · ${time}`;
  if (time) return time;
  return dateLabel || null;
}

// ── Unified item type ────────────────────────────────────────────────────────

interface TodayItem {
  id:       string;
  kind:     "task" | "event" | "reminder";
  title:    string;
  dateStr:  string | null;
  sortTime: string;
  metadata: Record<string, unknown>;
  original: Task | Reminder;
}

function taskToItem(t: Task): TodayItem {
  const meta = (t.metadata ?? {}) as Record<string, unknown>;
  let sortTime = "99:99";
  if (typeof meta.display_time === "string") sortTime = meta.display_time;
  else if (t.due_at) {
    const d = new Date(t.due_at);
    if (!isNaN(d.getTime())) sortTime = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  return {
    id: t.id,
    kind: t.task_type === "event" ? "event" : "task",
    title: t.title,
    dateStr: (typeof meta.display_date === "string" ? meta.display_date : null) || t.due_date,
    sortTime,
    metadata: t.metadata ?? {},
    original: t,
  };
}

function reminderToItem(r: Reminder): TodayItem {
  const meta = (r.metadata ?? {}) as Record<string, unknown>;
  let sortTime = "99:99";
  if (typeof meta.display_time === "string") sortTime = meta.display_time;
  else if (r.scheduled_for) {
    const d = new Date(r.scheduled_for);
    if (!isNaN(d.getTime())) sortTime = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  return {
    id: r.id,
    kind: "reminder",
    title: r.title,
    dateStr: (typeof meta.display_date === "string" ? meta.display_date : null) || r.scheduled_date,
    sortTime,
    metadata: r.metadata ?? {},
    original: r,
  };
}

interface DateGroup {
  bucket: DateBucket;
  label:  string;
  items:  TodayItem[];
}

function groupByDate(items: TodayItem[]): DateGroup[] {
  const buckets = new Map<DateBucket, TodayItem[]>();
  for (const item of items) {
    const b = getDateBucket(item.dateStr);
    if (!buckets.has(b)) buckets.set(b, []);
    buckets.get(b)!.push(item);
  }

  for (const [, arr] of buckets) {
    arr.sort((a, b) => {
      if (a.sortTime !== b.sortTime) return a.sortTime.localeCompare(b.sortTime);
      const aOrig = a.original as { created_at?: string };
      const bOrig = b.original as { created_at?: string };
      return (aOrig.created_at ?? "").localeCompare(bOrig.created_at ?? "");
    });
  }

  return BUCKET_ORDER
    .filter((b) => buckets.has(b))
    .map((b) => ({ bucket: b, label: BUCKET_LABELS[b], items: buckets.get(b)! }));
}

// ── SwipeRow ─────────────────────────────────────────────────────────────────

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
      {rightProg > 0 && (
        <div style={{
          position: "absolute", inset: 0,
          background: `rgba(91,168,138,${0.04 + rightProg * 0.08})`,
          display: "flex", alignItems: "center", paddingLeft: space[5],
        }}>
          {rightProg > 0.15 && (
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke={color.success} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
              style={{ opacity: Math.min(1, rightProg * 1.5) }}
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
      )}

      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging ? "none" : `transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)`,
          position: "relative",
          zIndex: 1,
          background: color.surface,
        }}
      >
        {children}
      </div>

      {isOpen && (
        <div style={{
          position: "absolute",
          top: 0, right: 0, bottom: 0,
          width: ACTION_TRAY_W,
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: space[2], zIndex: 3,
          background: `${color.canvas}F5`,
        }}>
          {onEdit && (
            <motion.button
              whileTap={{ scale: 0.88 }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); closeTray(); onEdit(); }}
              style={{
                width: 36, height: 36, borderRadius: radius.sm,
                background: color.accentSoft, border: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", touchAction: "manipulation",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color.accent} strokeWidth={2} strokeLinecap="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </motion.button>
          )}
          {onDelete && (
            <motion.button
              whileTap={{ scale: 0.88 }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); closeTray(); haptic.warning(); onDelete(); }}
              style={{
                width: 36, height: 36, borderRadius: radius.sm,
                background: color.destructiveSoft, border: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", touchAction: "manipulation",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color.destructive} strokeWidth={2} strokeLinecap="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </motion.button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Item Row ─────────────────────────────────────────────────────────────────

const KIND_LABELS: Record<TodayItem["kind"], string> = {
  task: "to do",
  event: "event",
  reminder: "reminder",
};

function ItemRow({ item, timeLabel, onAction, onDelete, onEdit, completing }: {
  item: TodayItem;
  timeLabel: string | null;
  onAction: () => void;
  onDelete: () => void;
  onEdit?: () => void;
  completing?: boolean;
}) {
  const kc = kindColor[item.kind];
  const isReminder = item.kind === "reminder";

  return (
    <SwipeRow onSwipeRight={onAction} onEdit={onEdit} onDelete={onDelete}>
      <motion.div
        onClick={onEdit}
        layout
        animate={completing ? { opacity: 0, x: 8, height: 0 } : { opacity: 1, x: 0 }}
        transition={completing ? { ...m.ease.default, delay: 0.15 } : m.ease.fast}
        style={{
          padding: `${space[3]}px ${space[4]}px`,
          display: "flex", alignItems: "center", gap: space[3],
          cursor: onEdit ? "pointer" : undefined,
        }}
      >
        {isReminder ? (
          <KindDot color={kc.dot} />
        ) : item.kind === "event" ? (
          <KindDot color={kc.dot} />
        ) : (
          <CheckCircle checked={false} completing={completing} onToggle={onAction} />
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <Text as="p" style="callout" color={color.ink} css={{ fontWeight: 500 }}>
            {item.title}
          </Text>
          {timeLabel ? (
            <Text style="footnote" color={color.tertiary}>
              {timeLabel}
            </Text>
          ) : (
            <Text style="micro" color={color.ghost}>
              {KIND_LABELS[item.kind]}
            </Text>
          )}
        </div>

        {isReminder && (
          <PillButton label="Done" color={color.accent} onClick={(e) => { e.stopPropagation(); onAction(); }} />
        )}

        {item.kind === "event" && (
          <CheckCircle checked={false} completing={completing} onToggle={onAction} accentColor={color.success} />
        )}
      </motion.div>
    </SwipeRow>
  );
}

function CompletedRow({ task, onReopen }: { task: Task; onReopen: (id: string) => void }) {
  return (
    <motion.div
      layout
      onClick={() => onReopen(task.id)}
      whileTap={{ scale: 0.99 }}
      style={{
        padding: `${space[3]}px ${space[4]}px`,
        display: "flex", alignItems: "center", gap: space[3],
        cursor: "pointer",
      }}
    >
      <CheckCircle checked={true} onToggle={() => onReopen(task.id)} />
      <Text as="p" style="callout" color={color.ghost} strike css={{ flex: 1 }}>
        {task.title}
      </Text>
      <Text style="micro" color={color.tertiary}>Restore</Text>
    </motion.div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonList() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.08 }}
          style={{
            background: color.accentSoft,
            borderRadius: radius.md,
            height: 52,
            animation: "shimmer 1.6s ease-in-out infinite",
          }}
        />
      ))}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

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

export default function TodayItemsList({ userName }: { userName: string }) {
  const {
    items, loading, refresh,
    completeTask, reopenTask, deleteTask,
    dismissReminder, restoreReminder, deleteReminder,
  } = useTodayItems();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(null);

  // ── Handlers ────────────────────────────────────────────────────────────

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
        onUndo: () => { restoreReminder(id); setUndoAction(null); },
      });
    }
  }, [items.reminders, dismissReminder, restoreReminder]);

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
    const meta = (task.metadata ?? {}) as Record<string, unknown>;
    const dateStr = (typeof meta.display_date === "string" ? meta.display_date : null) || task.due_date || "";
    let timeStr = "";
    if (typeof meta.display_time === "string") {
      timeStr = meta.display_time;
    } else if (task.due_at) {
      const d = new Date(task.due_at);
      timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
    setEditTarget({ id: task.id, kind: "task", title: task.title, date: dateStr, time: timeStr, itemType: task.task_type === "event" ? "event" : "task" });
    setSheetOpen(true);
  }, []);

  const openEditReminder = useCallback((r: Reminder) => {
    haptic.light();
    const meta = (r.metadata ?? {}) as Record<string, unknown>;
    let dateStr = (typeof meta.display_date === "string" ? meta.display_date : null) || r.scheduled_date || "";
    let timeStr = "";
    if (typeof meta.display_time === "string") {
      timeStr = meta.display_time;
    } else if (r.scheduled_for) {
      const d = new Date(r.scheduled_for);
      if (!dateStr) {
        dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      }
      timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
    setEditTarget({ id: r.id, kind: "reminder", title: r.title, date: dateStr, time: timeStr, itemType: "reminder" });
    setSheetOpen(true);
  }, []);

  const handleCreate = useCallback(() => { haptic.success(); refresh(); }, [refresh]);

  const requestDeleteTask = useCallback((id: string) => {
    const item = [...items.tasks, ...items.events].find((t) => t.id === id);
    setDeleteConfirm({ id, kind: "task", title: item?.title ?? "this item" });
  }, [items.tasks, items.events]);

  const requestDeleteReminder = useCallback((id: string) => {
    const item = items.reminders.find((r) => r.id === id);
    setDeleteConfirm({ id, kind: "reminder", title: item?.title ?? "this item" });
  }, [items.reminders]);

  const executeDelete = useCallback(async () => {
    if (!deleteConfirm) return;
    const { id, kind } = deleteConfirm;
    setDeleteConfirm(null);
    haptic.warning();
    if (kind === "task") await deleteTask(id);
    else await deleteReminder(id);
  }, [deleteConfirm, deleteTask, deleteReminder]);

  const handleItemAction = useCallback((item: TodayItem) => {
    if (item.kind === "reminder") handleDismiss(item.id);
    else handleComplete(item.id);
  }, [handleDismiss, handleComplete]);

  const handleItemDelete = useCallback((item: TodayItem) => {
    if (item.kind === "reminder") requestDeleteReminder(item.id);
    else requestDeleteTask(item.id);
  }, [requestDeleteReminder, requestDeleteTask]);

  const handleItemEdit = useCallback((item: TodayItem) => {
    if (item.kind === "reminder") openEditReminder(item.original as Reminder);
    else openEdit(item.original as Task);
  }, [openEditReminder, openEdit]);

  // ── Derived state ──────────────────────────────────────────────────────

  const name = userName || "there";
  const totalOpen = items.tasks.length + items.events.length + items.reminders.length;

  const allItems: TodayItem[] = [
    ...items.tasks.map(taskToItem),
    ...items.events.map(taskToItem),
    ...items.reminders.map(reminderToItem),
  ];
  const dateGroups = groupByDate(allItems);

  if (loading) return <SkeletonList />;

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={m.ease.default}
      style={{ display: "flex", flexDirection: "column", gap: space[4] }}
    >
      {/* Greeting */}
      <div style={{ padding: `${space[5]}px ${space[1]}px ${space[2]}px` }}>
        <Text as="p" style="caption" color={color.placeholder} css={{ marginBottom: space[1] }}>
          {formatDate()}
        </Text>
        <Text as="h1" style="display" color={color.ink} css={{ marginBottom: space[1] }}>
          {greeting(name)}
        </Text>
        <Text as="p" style="callout" color={color.tertiary}>
          {totalOpen === 0
            ? "Your day is clear."
            : `${totalOpen} ${totalOpen === 1 ? "thing" : "things"} on your mind.`}
        </Text>
      </div>

      {/* Quick add — desktop only */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => { setEditTarget(null); setSheetOpen(true); }}
        className="desktop-only-add"
        style={{
          background: color.surface,
          borderRadius: radius.lg,
          border: `1px solid ${color.borderSubtle}`,
          boxShadow: shadow.subtle,
          padding: `${space[3]}px ${space[4]}px`,
          alignItems: "center", gap: space[3],
          cursor: "pointer",
        }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: radius.sm,
          background: color.accentSoft, display: "flex",
          alignItems: "center", justifyContent: "center",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color.accent} strokeWidth={2.5} strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
        <Text style="callout" color={color.secondary}>Add something...</Text>
      </motion.button>

      {/* Date-grouped items */}
      <AnimatePresence mode="popLayout">
        {dateGroups.map((group, gi) => {
          const bs = bucketStyle[group.bucket];
          return (
            <motion.section
              key={group.bucket}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...m.ease.default, delay: gi * 0.04 }}
            >
              <div style={{
                display: "flex", alignItems: "baseline",
                paddingLeft: space[1], marginBottom: space[2],
              }}>
                <Text style="caption" color={bs.label}>
                  {group.label}
                  {group.bucket === "overdue" && (
                    <Text as="span" style="caption" color={bs.label} css={{ fontWeight: 400, opacity: 0.7 }}>
                      {" "}· needs attention
                    </Text>
                  )}
                </Text>
              </div>

              <Surface
                elevation="card"
                rounded="lg"
                css={{
                  opacity: bs.opacity,
                  ...(group.bucket === "overdue" ? {
                    border: `1px solid ${color.overdueSoft.replace("0.06", "0.15")}`,
                    background: color.overdueSoft,
                  } : {}),
                }}
              >
                {group.items.map((item, i) => (
                  <div key={item.id} style={{
                    borderBottom: i < group.items.length - 1 ? `1px solid ${color.borderSubtle}` : "none",
                  }}>
                    <ItemRow
                      item={item}
                      timeLabel={group.bucket === "today" ? getItemTimeOnly(item) : getItemTimeContextual(item)}
                      onAction={() => handleItemAction(item)}
                      onDelete={() => handleItemDelete(item)}
                      onEdit={() => handleItemEdit(item)}
                      completing={completingIds.has(item.id)}
                    />
                  </div>
                ))}
              </Surface>
            </motion.section>
          );
        })}
      </AnimatePresence>

      {/* Empty state */}
      {totalOpen === 0 && items.completed.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={m.ease.slow}
        >
          <Surface padding={8} css={{ textAlign: "center" }}>
            <Text as="p" style="callout" color={color.tertiary}>Your day is clear.</Text>
            <Text as="p" style="caption" color={color.ghost} css={{ marginTop: space[1] }}>
              Tap + to add something.
            </Text>
          </Surface>
        </motion.div>
      )}

      {/* Completed */}
      {items.completed.length > 0 && (
        <Section label="Done today" labelColor={color.ghost}>
          <Surface>
            {items.completed.map((task, i) => (
              <div key={task.id} style={{
                borderBottom: i < items.completed.length - 1 ? `1px solid ${color.borderSubtle}` : "none",
              }}>
                <CompletedRow task={task} onReopen={handleReopen} />
              </div>
            ))}
          </Surface>
        </Section>
      )}

      {/* Quick-add sheet */}
      <QuickAddSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditTarget(null); }}
        onCreated={handleCreate}
        editTarget={editTarget}
      />

      <UndoToast action={undoAction} />

      {deleteConfirm && (
        <ConfirmDeleteDialog
          confirm={deleteConfirm}
          onCancel={() => setDeleteConfirm(null)}
          onDelete={executeDelete}
        />
      )}

      {/* FAB — mobile only */}
      {!sheetOpen && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => { setEditTarget(null); haptic.light(); setSheetOpen(true); }}
          aria-label="Quick add"
          className="mobile-only-fab"
          style={{
            position: "fixed",
            bottom: `calc(60px + env(safe-area-inset-bottom, 0px) + ${space[5] * 4}px)`,
            right: space[4],
            zIndex: 45,
            width: 48, height: 48,
            borderRadius: radius.md,
            background: color.accent,
            border: "none",
            boxShadow: `0 4px 20px rgba(108,105,224,0.25), 0 2px 6px rgba(0,0,0,0.06)`,
            alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </motion.button>
      )}
    </motion.div>
  );
}
