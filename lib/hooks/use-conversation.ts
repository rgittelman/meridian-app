"use client";

/**
 * lib/hooks/use-conversation.ts
 *
 * Production chat state: persistence, streaming, optimistic UI, retry.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import type { ChatMessage } from "@/types";
import type { PersistedMessage } from "@/lib/conversations/types";

interface UseConversationResult {
  messages:            ChatMessage[];
  conversationId:      string | null;
  conversationTitle:   string | null;
  isStreaming:         boolean;
  isLoading:           boolean;
  memoryMeta:          { count: number; ids: string[]; provider?: string; toneState?: string; patternCount?: number };
  sendMessage:         (text: string) => Promise<void>;
  retryLast:           () => Promise<void>;
  loadConversation:    (id: string) => Promise<void>;
  startNewChat:        () => Promise<void>;
  deleteConversation:  (id: string) => Promise<void>;
  userName:            string | null;
}

function toChatMessage(m: PersistedMessage): ChatMessage {
  return {
    id:        m.id,
    role:      m.role,
    content:   m.content,
    createdAt: new Date(m.created_at),
    status:    m.status === "error" ? "error" : "sent",
  };
}

/** Batch streaming token updates for render performance. */
function useBatchedUpdater(
  setter: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
) {
  const bufferRef = useRef("");
  const idRef     = useRef<string | null>(null);
  const rafRef    = useRef<number | null>(null);

  const flush = useCallback(() => {
    if (!idRef.current || !bufferRef.current) return;
    const id      = idRef.current;
    const toAdd   = bufferRef.current;
    bufferRef.current = "";
    setter((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, content: m.content + toAdd, status: "streaming" } : m,
      ),
    );
  }, [setter]);

  const append = useCallback((id: string, token: string) => {
    idRef.current = id;
    bufferRef.current += token;
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        flush();
      });
    }
  }, [flush]);

  const reset = useCallback(() => {
    bufferRef.current = "";
    idRef.current = null;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  return { append, flush, reset };
}

export function useConversation(): UseConversationResult {
  const [messages,         setMessages]         = useState<ChatMessage[]>([]);
  const [conversationId,   setConversationId]   = useState<string | null>(null);
  const [conversationTitle,setConversationTitle]= useState<string | null>(null);
  const [isStreaming,      setIsStreaming]      = useState(false);
  const [isLoading,        setIsLoading]          = useState(true);
  const [memoryMeta,       setMemoryMeta]       = useState({ count: 0, ids: [] as string[], provider: undefined as string | undefined, toneState: undefined as string | undefined, patternCount: undefined as number | undefined });
  const [userName,         setUserName]         = useState<string | null>(null);

  const lastUserTextRef = useRef<string | null>(null);
  const { append, flush, reset } = useBatchedUpdater(setMessages);

  // Load active conversation + user name on mount
  useEffect(() => {
    import("@/lib/supabase/client").then(({ createClient }) => {
      createClient().auth.getUser().then(({ data: { user } }) => {
        if (user) {
          setUserName(
            user.user_metadata?.full_name ??
            user.user_metadata?.name ??
            null,
          );
        }
      });
    });

    fetch("/api/conversations?active=true")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load conversations");
        return r.json();
      })
      .then((data) => {
        if (data.conversation) {
          setConversationId(data.conversation.id);
          setConversationTitle(data.conversation.title);
          setMessages((data.messages ?? []).map(toChatMessage));
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const ensureConversation = useCallback(async (): Promise<string> => {
    if (conversationId) return conversationId;
    const res = await fetch("/api/conversations", { method: "POST" });
    if (!res.ok) throw new Error("Could not start a conversation. Try refreshing.");
    const data = await res.json();
    if (!data.conversation?.id) throw new Error("Could not start a conversation. Try refreshing.");
    setConversationId(data.conversation.id);
    setConversationTitle(data.conversation.title);
    return data.conversation.id;
  }, [conversationId]);

  const streamResponse = useCallback(async (
    convId:    string,
    history:   { role: "user" | "assistant"; content: string }[],
    assistantId: string,
  ) => {
    setIsStreaming(true);
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", createdAt: new Date(), status: "streaming" },
    ]);

    let res: Response;
    try {
      res = await fetch("/api/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ conversationId: convId, messages: history }),
        signal:  AbortSignal.timeout(90_000),
      });
    } catch (fetchErr) {
      setIsStreaming(false);
      const msg = fetchErr instanceof DOMException && fetchErr.name === "TimeoutError"
        ? "Request timed out. Try again."
        : "Network error — check your connection.";
      throw new Error(msg);
    }

    if (!res.ok || !res.body) {
      setIsStreaming(false);
      const errBody = await res.json().catch(() => null);
      if (res.status === 401) throw new Error("Session expired. Please sign in again.");
      if (res.status === 503) throw new Error(errBody?.error ?? "AI service is temporarily unavailable.");
      throw new Error(errBody?.error ?? "Something went wrong. Try again.");
    }

    setMemoryMeta({
      count:        Number(res.headers.get("X-Memory-Count") ?? 0),
      ids:          (res.headers.get("X-Memory-Ids") ?? "").split(",").filter(Boolean),
      provider:     res.headers.get("X-AI-Provider") ?? undefined,
      toneState:    res.headers.get("X-Tone-State") ?? undefined,
      patternCount: Number(res.headers.get("X-Pattern-Count") ?? 0) || undefined,
    });

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let finalContent = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const token = decoder.decode(value, { stream: true });
        finalContent += token;
        append(assistantId, token);
      }
    } catch {
      if (!finalContent.trim()) {
        setIsStreaming(false);
        throw new Error("Connection interrupted. Try again.");
      }
    }

    flush();
    reset();

    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantId
          ? { ...m, content: finalContent, status: "sent" as const }
          : m,
      ),
    );

    setIsStreaming(false);

    const forIngest = [...history, { role: "assistant" as const, content: finalContent }];
    if (forIngest.length >= 2) {
      fetch("/api/memory/ingest", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ messages: forIngest, conversationId: convId }),
      })
        .then((r) => r.json())
        .then((data) => {
          const loop = data?.os_loop;
          const action = data?.chat_action;

          if (loop && (loop.tasksCreated > 0 || loop.remindersCreated > 0)) {
            console.log("[chat] items created — broadcasting refresh", loop);
            window.dispatchEvent(new CustomEvent("meridian:todayRefresh"));
          }

          // Show confirmation based on ACTUAL persistence, not AI text
          if (action?.persisted && action.reason === "created") {
            const label = action.type === "reminder" ? "Reminder" : action.type === "event" ? "Event" : "Task";
            let confirm = `${label} saved: "${action.title}"`;
            if (action.date) {
              const d = new Date(action.date + "T00:00:00");
              const dayStr = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
              confirm += ` — ${dayStr}`;
            }
            if (action.time) {
              const [h, m] = action.time.split(":").map(Number);
              const ampm = h >= 12 ? "PM" : "AM";
              const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
              confirm += ` at ${h12}:${String(m).padStart(2, "0")} ${ampm}`;
            }
            confirm += ".";

            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: "assistant",
                content: confirm,
                createdAt: new Date(),
                status: "sent",
              },
            ]);
          }
        })
        .catch(() => {});
    }

    return finalContent;
  }, [append, flush, reset]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    lastUserTextRef.current = trimmed;
    const userId = crypto.randomUUID();
    const userMsg: ChatMessage = {
      id: userId, role: "user", content: trimmed,
      createdAt: new Date(), status: "sending",
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    try {
      const convId = await ensureConversation();

      try {
        await fetch(`/api/conversations/${convId}/messages`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ role: "user", content: trimmed }),
        });
      } catch {
        // Message persist failed, but we can still try to get a response
      }

      setMessages((prev) =>
        prev.map((m) => m.id === userId ? { ...m, status: "sent" } : m),
      );

      const history = updatedMessages
        .filter((m) => m.status !== "error")
        .map((m) => ({ role: m.role, content: m.content }));

      await streamResponse(convId, history, crypto.randomUUID());
    } catch (err) {
      setIsStreaming(false);
      const errorMessage = err instanceof Error ? err.message : "Something went wrong. Try again.";
      setMessages((prev) => [
        ...prev.filter((m) => m.status !== "streaming"),
        {
          id: crypto.randomUUID(), role: "assistant",
          content: errorMessage,
          createdAt: new Date(), status: "error",
          retryPayload: trimmed,
        },
      ]);
    }
  }, [isStreaming, messages, ensureConversation, streamResponse]);

  const retryLast = useCallback(async () => {
    const text = lastUserTextRef.current;
    if (!text) return;
    setIsStreaming(false);
    setMessages((prev) => prev.filter((m) => m.status !== "error"));
    await sendMessage(text);
  }, [sendMessage]);

  const loadConversation = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const res  = await fetch(`/api/conversations/${id}`);
      if (!res.ok) throw new Error("Failed to load conversation");
      const data = await res.json();
      setConversationId(data.conversation.id);
      setConversationTitle(data.conversation.title);
      setMessages((data.messages ?? []).map(toChatMessage));
      fetch(`/api/conversations/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ set_active: true }),
      }).catch(() => {});
    } catch {
      // Conversation load failed — stay on current state
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startNewChat = useCallback(async () => {
    const res  = await fetch("/api/conversations", { method: "POST" });
    const data = await res.json();
    setConversationId(data.conversation.id);
    setConversationTitle(data.conversation.title);
    setMessages([]);
    setMemoryMeta({ count: 0, ids: [], provider: undefined, toneState: undefined, patternCount: undefined });
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (id === conversationId) {
      setConversationId(null);
      setConversationTitle(null);
      setMessages([]);
      setMemoryMeta({ count: 0, ids: [], provider: undefined, toneState: undefined, patternCount: undefined });
    }
  }, [conversationId]);

  return {
    messages, conversationId, conversationTitle,
    isStreaming, isLoading, memoryMeta,
    sendMessage, retryLast, loadConversation, startNewChat, deleteConversation,
    userName,
  };
}
