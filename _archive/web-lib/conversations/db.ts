/**
 * lib/conversations/db.ts — Typed Supabase wrappers for conversations.
 */

import { createClient } from "@/lib/supabase/server";
import type { Conversation, PersistedMessage, MessageStatus } from "./types";

const TITLE_MAX = 60;

export function deriveTitle(firstUserMessage: string): string {
  const trimmed = firstUserMessage.trim().replace(/\s+/g, " ");
  if (trimmed.length <= TITLE_MAX) return trimmed;
  return trimmed.slice(0, TITLE_MAX - 1) + "…";
}

// ── Conversations ─────────────────────────────────────────────────────────────

export async function listConversations(
  userId: string,
  limit = 30,
): Promise<Conversation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[conversations] list:", error.message);
    return [];
  }
  return (data ?? []) as Conversation[];
}

export async function getActiveConversation(
  userId: string,
): Promise<Conversation | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data as Conversation | null;
}

export async function getConversation(
  userId: string,
  conversationId: string,
): Promise<Conversation | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .single();

  return data as Conversation | null;
}

export async function createConversation(
  userId: string,
  title = "New conversation",
): Promise<Conversation | null> {
  const supabase = await createClient();

  // Deactivate other active conversations (one active thread at a time)
  await supabase
    .from("conversations")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("is_active", true);

  const { data, error } = await supabase
    .from("conversations")
    .insert({ user_id: userId, title, is_active: true })
    .select()
    .single();

  if (error) {
    console.error("[conversations] create:", error.message);
    return null;
  }
  return data as Conversation;
}

export async function updateConversation(
  userId: string,
  conversationId: string,
  updates: Partial<Pick<Conversation, "title" | "is_active">>,
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("conversations")
    .update(updates)
    .eq("id", conversationId)
    .eq("user_id", userId);
}

/** Soft-delete: sets deleted_at, clears is_active. */
export async function softDeleteConversation(
  userId: string,
  conversationId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("conversations")
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq("id", conversationId)
    .eq("user_id", userId);

  return !error;
}

export async function setActiveConversation(
  userId: string,
  conversationId: string,
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("conversations")
    .update({ is_active: false })
    .eq("user_id", userId);

  await supabase
    .from("conversations")
    .update({ is_active: true })
    .eq("id", conversationId)
    .eq("user_id", userId);
}

// ── Messages ──────────────────────────────────────────────────────────────────

export async function getMessages(
  userId: string,
  conversationId: string,
  limit = 100,
): Promise<PersistedMessage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[conversations] getMessages:", error.message);
    return [];
  }
  return (data ?? []) as PersistedMessage[];
}

export async function insertMessage(
  userId: string,
  conversationId: string,
  message: {
    role:     "user" | "assistant";
    content:  string;
    status?:  MessageStatus;
    metadata?: Record<string, unknown>;
  },
): Promise<PersistedMessage | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      user_id:         userId,
      conversation_id: conversationId,
      role:            message.role,
      content:         message.content,
      status:          message.status ?? "sent",
      metadata:        message.metadata ?? {},
    })
    .select()
    .single();

  if (error) {
    console.error("[conversations] insertMessage:", error.message);
    return null;
  }

  // Touch conversation updated_at
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId)
    .eq("user_id", userId);

  return data as PersistedMessage;
}

export async function updateMessageContent(
  userId: string,
  messageId: string,
  content: string,
  status: MessageStatus = "sent",
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("messages")
    .update({ content, status })
    .eq("id", messageId)
    .eq("user_id", userId);
}

export async function getConversationWithMessages(
  userId: string,
  conversationId: string,
): Promise<{ conversation: Conversation; messages: PersistedMessage[] } | null> {
  const conversation = await getConversation(userId, conversationId);
  if (!conversation) return null;
  const messages = await getMessages(userId, conversationId);
  return { conversation, messages };
}
