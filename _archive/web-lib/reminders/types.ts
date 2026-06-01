/**
 * lib/reminders/types.ts — Reminder architecture types.
 */

import type { LifeDomain } from "@/lib/domains/types";

export type ReminderType   = "task" | "contextual" | "recurring" | "reflection" | "manual";
export type ReminderStatus = "pending" | "sent" | "dismissed" | "snoozed";

export interface Reminder {
  id:              string;
  user_id:         string;
  title:           string;
  body:            string | null;
  reminder_type:   ReminderType;
  status:          ReminderStatus;
  task_id:         string | null;
  memory_id:       string | null;
  scheduled_for:   string | null;
  scheduled_date:  string | null;
  recurrence:      string | null;
  why_shown:       string | null;
  gentle:          boolean;
  domains:         LifeDomain[];
  metadata:        Record<string, unknown>;
  created_at:      string;
  updated_at:      string;
}

export interface ReminderCandidate {
  title:          string;
  body?:          string;
  reminder_type:  ReminderType;
  task_id?:       string;
  memory_id?:     string;
  scheduled_for?: string;
  why_shown:      string;
  domains?:       LifeDomain[];
  display_time?:  string;
  display_date?:  string;
}
