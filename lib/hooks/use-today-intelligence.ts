"use client";

/**
 * lib/hooks/use-today-intelligence.ts — Fetch Today intelligence with optimistic actions.
 */

import { useState, useEffect, useCallback } from "react";
import type { TodayIntelligence } from "@/lib/today/types";

interface UseTodayIntelligenceResult {
  data:      TodayIntelligence | null;
  loading:   boolean;
  error:     string | null;
  refresh:   () => Promise<void>;
  dismissReminder:   (id: string) => Promise<void>;
  snoozeReminder:    (id: string) => Promise<void>;
  completeReminder:  (id: string, taskId?: string | null) => Promise<void>;
  completeTask:      (id: string) => Promise<void>;
}

export function useTodayIntelligence(): UseTodayIntelligenceResult {
  const [data,    setData]    = useState<TodayIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetchIntelligence = useCallback(async () => {
    try {
      const res = await fetch("/api/today/intelligence", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load");
      setData(await res.json());
      setError(null);
    } catch {
      setError("Couldn't load today's view.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchIntelligence(); }, [fetchIntelligence]);

  const dismissReminder = useCallback(async (id: string) => {
    setData((prev) => prev ? {
      ...prev,
      pendingReminders: prev.pendingReminders.filter((r) => r.id !== id),
    } : prev);
    const res = await fetch(`/api/reminders/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status: "dismissed" }),
    });
    if (!res.ok) await fetchIntelligence();
  }, [fetchIntelligence]);

  const snoozeReminder = useCallback(async (id: string) => {
    setData((prev) => prev ? {
      ...prev,
      pendingReminders: prev.pendingReminders.filter((r) => r.id !== id),
    } : prev);
    const res = await fetch(`/api/reminders/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status: "snoozed" }),
    });
    if (!res.ok) await fetchIntelligence();
  }, [fetchIntelligence]);

  const completeReminder = useCallback(async (id: string, taskId?: string | null) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        pendingReminders: prev.pendingReminders.filter((r) => r.id !== id),
        focusItems:       taskId ? prev.focusItems.filter((t) => t.id !== taskId) : prev.focusItems,
        overdueCommitments: taskId
          ? prev.overdueCommitments.filter((t) => t.id !== taskId)
          : prev.overdueCommitments,
        postponedTasks: taskId
          ? prev.postponedTasks.filter((t) => t.id !== taskId)
          : prev.postponedTasks,
      };
    });
    const res = await fetch(`/api/reminders/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status: "dismissed" }),
    });
    if (taskId) {
      await fetch(`/api/tasks/${taskId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status: "done" }),
      });
    }
    if (!res.ok) await fetchIntelligence();
  }, [fetchIntelligence]);

  const completeTask = useCallback(async (id: string) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        focusItems:         prev.focusItems.filter((t) => t.id !== id),
        overdueCommitments: prev.overdueCommitments.filter((t) => t.id !== id),
        postponedTasks:     prev.postponedTasks.filter((t) => t.id !== id),
        morningFocusItems:  prev.morningFocusItems.filter((t) => t.id !== id),
      };
    });
    const res = await fetch(`/api/tasks/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status: "done" }),
    });
    if (!res.ok) await fetchIntelligence();
  }, [fetchIntelligence]);

  return {
    data, loading, error, refresh: fetchIntelligence,
    dismissReminder, snoozeReminder, completeReminder, completeTask,
  };
}
