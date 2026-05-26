/**
 * lib/tasks/types.ts — Task extraction and storage types.
 */

import type { LifeDomain } from "@/lib/domains/types";

export type TaskType   = "hard" | "soft" | "event";
export type TaskStatus = "open" | "done" | "dismissed" | "snoozed";

export interface Task {
  id:               string;
  user_id:          string;
  title:            string;
  description:      string | null;
  task_type:        TaskType;
  status:           TaskStatus;
  confidence:       number;
  due_date:         string | null;
  due_at:           string | null;
  domains:          LifeDomain[];
  source_type:      "conversation" | "manual" | "memory" | "integration";
  source_id:        string | null;
  memory_id:        string | null;
  conversation_id:  string | null;
  postpone_count:   number;
  metadata:         Record<string, unknown>;
  created_at:       string;
  updated_at:       string;
}

/** Raw task extracted from conversation before persistence. */
export interface ExtractedTask {
  title:       string;
  description?: string;
  task_type:   TaskType;
  confidence:  number;
  due_date?:   string;
  domains?:    LifeDomain[];
  source_excerpt?: string;
}

export interface TaskExtractionResult {
  created:   Task[];
  skipped:   number;
  extracted: ExtractedTask[];
}

export interface TaskIngestInput {
  userId:          string;
  messages:        { role: "user" | "assistant"; content: string }[];
  conversationId?: string;
  memoryIds?:      string[];
}
