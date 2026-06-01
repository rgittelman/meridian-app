/**
 * lib/conversations/types.ts
 */

export type MessageStatus = "sending" | "sent" | "streaming" | "error";

export interface Conversation {
  id:         string;
  user_id:    string;
  title:      string;
  is_active:  boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PersistedMessage {
  id:              string;
  conversation_id: string;
  user_id:         string;
  role:            "user" | "assistant";
  content:         string;
  status:          MessageStatus;
  metadata:        Record<string, unknown>;
  created_at:      string;
}

export interface ConversationWithMessages extends Conversation {
  messages: PersistedMessage[];
}
