"use client";

/**
 * lib/hooks/use-today-items.ts — Fetch tasks, reminders, and events for Today screen.
 * Provides real CRUD operations with optimistic UI.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { Task } from "@/lib/tasks/types";
import type { Reminder } from "@/lib/reminders/types";

export interface TodayItems {
  tasks:      Task[];
  events:     Task[];
  reminders:  Reminder[];
  completed:  Task[];
}

interface UseTodayItemsResult {
  items:            TodayItems;
  loading:          boolean;
  refresh:          () => Promise<void>;
  completeTask:     (id: string) => Promise<void>;
  reopenTask:       (id: string) => Promise<void>;
  deleteTask:       (id: string) => Promise<void>;
  dismissReminder:  (id: string) => Promise<void>;
  restoreReminder:  (id: string) => Promise<void>;
  deleteReminder:   (id: string) => Promise<void>;
}

function todayDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function useTodayItems(): UseTodayItemsResult {
  const [items, setItems] = useState<TodayItems>({
    tasks: [], events: [], reminders: [], completed: [],
  });
  const [loading, setLoading] = useState(true);
  const dismissedRef = useRef<Map<string, Reminder>>(new Map());

  const refresh = useCallback(async () => {
    try {
      const [tasksRes, remindersRes, doneRes] = await Promise.all([
        fetch("/api/tasks?status=open"),
        fetch("/api/reminders?status=pending"),
        fetch("/api/tasks?status=done"),
      ]);

      const [tasksData, remindersData, doneData] = await Promise.all([
        tasksRes.ok ? tasksRes.json() : { tasks: [] },
        remindersRes.ok ? remindersRes.json() : { reminders: [] },
        doneRes.ok ? doneRes.json() : { tasks: [] },
      ]);

      const allOpen = (tasksData.tasks ?? []) as Task[];
      const today = todayDate();

      const tasks  = allOpen.filter((t) => t.task_type !== "event");
      const events = allOpen
        .filter((t) => t.task_type === "event")
        .sort((a, b) => {
          if (a.due_at && b.due_at) return a.due_at.localeCompare(b.due_at);
          if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
          return 0;
        });

      const recentDone = ((doneData.tasks ?? []) as Task[])
        .filter((t) => t.updated_at >= today)
        .slice(0, 10);

      setItems({
        tasks,
        events,
        reminders: remindersData.reminders ?? [],
        completed: recentDone,
      });
    } catch {
      // Keep existing items on failure
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Optimistic insert when chat creates an item — avoids full re-fetch delay
  useEffect(() => {
    const handleCreated = (e: Event) => {
      const action = (e as CustomEvent).detail;
      if (!action?.id || !action?.title) return;
      console.log("[today-items] optimistic insert:", action.type, action.title);

      const now = new Date().toISOString();

      if (action.type === "reminder") {
        const newReminder: Reminder = {
          id: action.id,
          user_id: "",
          title: action.title,
          body: action.title,
          reminder_type: "manual",
          status: "pending",
          task_id: null,
          memory_id: null,
          scheduled_for: action.scheduled_for ?? null,
          scheduled_date: action.date ?? null,
          recurrence: null,
          why_shown: null,
          gentle: false,
          domains: [],
          metadata: {
            display_time: action.time ?? undefined,
            display_date: action.date ?? undefined,
          },
          created_at: now,
          updated_at: now,
        };
        setItems((prev) => ({
          ...prev,
          reminders: [...prev.reminders, newReminder],
        }));
      } else {
        const newTask: Task = {
          id: action.id,
          user_id: "",
          title: action.title,
          description: null,
          task_type: action.type === "event" ? "event" : "soft",
          status: "open",
          confidence: 1,
          due_date: action.date ?? null,
          due_at: action.scheduled_for ?? null,
          domains: [],
          source_type: "conversation",
          source_id: null,
          memory_id: null,
          conversation_id: null,
          postpone_count: 0,
          metadata: {
            display_time: action.time ?? undefined,
            display_date: action.date ?? undefined,
          },
          created_at: now,
          updated_at: now,
        };
        setItems((prev) => ({
          ...prev,
          ...(action.type === "event"
            ? { events: [...prev.events, newTask] }
            : { tasks: [...prev.tasks, newTask] }),
        }));
      }
    };

    const handleRefresh = () => {
      console.log("[today-items] received meridian:todayRefresh");
      refresh();
    };

    window.addEventListener("meridian:todayItemCreated", handleCreated);
    window.addEventListener("meridian:todayRefresh", handleRefresh);
    return () => {
      window.removeEventListener("meridian:todayItemCreated", handleCreated);
      window.removeEventListener("meridian:todayRefresh", handleRefresh);
    };
  }, [refresh]);

  const completeTask = useCallback(async (id: string) => {
    setItems((prev) => ({
      ...prev,
      tasks:     prev.tasks.filter((t) => t.id !== id),
      events:    prev.events.filter((t) => t.id !== id),
      completed: [
        { ...([...prev.tasks, ...prev.events].find((t) => t.id === id)!), status: "done" as const, updated_at: new Date().toISOString() },
        ...prev.completed,
      ].filter(Boolean),
    }));
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
    if (!res.ok) refresh();
  }, [refresh]);

  const reopenTask = useCallback(async (id: string) => {
    const task = items.completed.find((t) => t.id === id);
    if (!task) return;
    setItems((prev) => ({
      ...prev,
      completed: prev.completed.filter((t) => t.id !== id),
      ...(task.task_type === "event"
        ? { events: [...prev.events, { ...task, status: "open" as const }] }
        : { tasks: [...prev.tasks, { ...task, status: "open" as const }] }),
    }));
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "open" }),
    });
    if (!res.ok) refresh();
  }, [items.completed, refresh]);

  const deleteTask = useCallback(async (id: string) => {
    setItems((prev) => ({
      ...prev,
      tasks:     prev.tasks.filter((t) => t.id !== id),
      events:    prev.events.filter((t) => t.id !== id),
      completed: prev.completed.filter((t) => t.id !== id),
    }));
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  }, []);

  const dismissReminder = useCallback(async (id: string) => {
    setItems((prev) => {
      const reminder = prev.reminders.find((r) => r.id === id);
      if (reminder) dismissedRef.current.set(id, reminder);
      return { ...prev, reminders: prev.reminders.filter((r) => r.id !== id) };
    });
    console.log("[today-items] reminder dismissed:", id);
    await fetch(`/api/reminders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "dismissed" }),
    });
  }, []);

  const restoreReminder = useCallback(async (id: string) => {
    const stashed = dismissedRef.current.get(id);
    if (stashed) {
      dismissedRef.current.delete(id);
      setItems((prev) => ({
        ...prev,
        reminders: [...prev.reminders, { ...stashed, status: "pending" as const }],
      }));
      console.log("[today-items] reminder restored (optimistic):", id);
    }
    const res = await fetch(`/api/reminders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "pending" }),
    });
    console.log("[today-items] reminder restore API:", res.ok ? "ok" : "failed");
    if (!res.ok) refresh();
  }, [refresh]);

  const deleteReminder = useCallback(async (id: string) => {
    setItems((prev) => ({
      ...prev,
      reminders: prev.reminders.filter((r) => r.id !== id),
    }));
    await fetch(`/api/reminders/${id}`, { method: "DELETE" });
  }, []);

  return {
    items, loading, refresh,
    completeTask, reopenTask, deleteTask,
    dismissReminder, restoreReminder, deleteReminder,
  };
}
