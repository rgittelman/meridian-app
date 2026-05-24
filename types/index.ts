// ─── Domain types ────────────────────────────────────────────────────────────

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: Date;
}

export interface Item {
  id: string;
  title: string;
  category: "task" | "note" | "goal";
  done: boolean;
  createdAt: Date;
}

export interface Reminder {
  id: string;
  title: string;
  dueAt: Date;
  done: boolean;
}

export interface HealthLog {
  id: string;
  type: "sleep" | "exercise" | "mood" | "weight" | "custom";
  value: string | number;
  unit?: string;
  loggedAt: Date;
}

export interface MoneyLog {
  id: string;
  description: string;
  amount: number;
  category: string;
  type: "income" | "expense";
  date: Date;
}

// ─── Classification ──────────────────────────────────────────────────────────

export type MessageIntent =
  | "task"
  | "reminder"
  | "health"
  | "money"
  | "question"
  | "unknown";

export interface ClassifyResult {
  intent: MessageIntent;
  confidence: number;
}
