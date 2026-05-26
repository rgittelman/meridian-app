"use client";

/**
 * lib/hooks/use-today-items.ts — Fetch tasks, reminders, and events for Today screen.
 * Provides real CRUD operations with optimistic UI.
 */

import { useState, useEffect, useCallback } from "react";
import type { Task } from "@/lib/tasks/types";
import type { Reminder } from "@/lib/reminders/types";

export interface TodayItems {
  tasks:      Task[];
  events:     Task[];
  reminders:  Reminder[];
  completed:  Task[];
}

interface UseTodayItemsResult {
  items:          TodayItems;
  loading:        boolean;
  refresh:        () => Promise<void>;
  completeTask:   (id: string) => Promise<void>;
  reopenTask:     (id: string) => Promise<void>;
  deleteTask:     (id: string) => Promise<void>;
  dismissReminder: (id: string) => Promise<void>;
  deleteReminder:  (id: string) => Promise<void>;
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

  // Listen for cross-component refresh signals (e.g. after chat creates a reminder)
  useEffect(() => {
    const handler = () => {
      console.log("[today-items] received meridian:todayRefresh");
      refresh();
    };
    window.addEventListener("meridian:todayRefresh", handler);
    return () => window.removeEventListener("meridian:todayRefresh", handler);
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
    setItems((prev) => ({
      ...prev,
      reminders: prev.reminders.filter((r) => r.id !== id),
    }));
    await fetch(`/api/reminders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "dismissed" }),
    });
  }, []);

  const deleteReminder = useCallback(async (id: string) => {
    setItems((prev) => ({
      ...prev,
      reminders: prev.reminders.filter((r) => r.id !== id),
    }));
    await fetch(`/api/reminders/${id}`, { method: "DELETE" });
  }, []);

  return {
    items, loading, refresh,
    completeTask, reopenTask, deleteTask, dismissReminder, deleteReminder,
  };
}
