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
      .then((r) => r.json())
      .then((data) => {
        if (data.conversation) {
          setConversationId(data.conversation.id);
          setConversationTitle(data.conversation.title);
          setMessages((data.messages ?? []).map(toChatMessage));
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const ensureConversation = useCallback(async (): Promise<string> => {
    if (conversationId) return conversationId;
    const res  = await fetch("/api/conversations", { method: "POST" });
    const data = await res.json();
    setConversationId(data.conversation.id);
    setConversationTitle(data.conversation.title);
    return data.conversation.id;
  }, [conversationId]);

  const streamResponse = useCallback(async (
    convId:    string,
    history:   { role: "user" | "assistant"; content: string }[],
    assistantId: string,
  ) => {
    const res = await fetch("/api/chat", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ conversationId: convId, messages: history }),
    });

    if (!res.ok || !res.body) {
      const errBody = await res.json().catch(() => null);
      throw new Error(errBody?.error ?? "Stream failed");
    }

    setMemoryMeta({
      count:        Number(res.headers.get("X-Memory-Count") ?? 0),
      ids:          (res.headers.get("X-Memory-Ids") ?? "").split(",").filter(Boolean),
      provider:     res.headers.get("X-AI-Provider") ?? undefined,
      toneState:    res.headers.get("X-Tone-State") ?? undefined,
      patternCount: Number(res.headers.get("X-Pattern-Count") ?? 0) || undefined,
    });

    setIsStreaming(true);
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", createdAt: new Date(), status: "streaming" },
    ]);

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let finalContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const token = decoder.decode(value, { stream: true });
      finalContent += token;
      append(assistantId, token);
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

    // Memory ingestion (fire-and-forget)
    const forIngest = [...history, { role: "assistant" as const, content: finalContent }];
    if (forIngest.length >= 2) {
      fetch("/api/memory/ingest", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ messages: forIngest, conversationId: convId }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (process.env.NODE_ENV === "development") console.log("[memory:ingest]", d);
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

      // Persist user message
      await fetch(`/api/conversations/${convId}/messages`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ role: "user", content: trimmed }),
      });

      setMessages((prev) =>
        prev.map((m) => m.id === userId ? { ...m, status: "sent" } : m),
      );

      const history = updatedMessages
        .filter((m) => m.status !== "error")
        .map((m) => ({ role: m.role, content: m.content }));

      await streamResponse(convId, history, crypto.randomUUID());
    } catch {
      setIsStreaming(false);
      setMessages((prev) => [
        ...prev.filter((m) => m.status !== "streaming"),
        {
          id: crypto.randomUUID(), role: "assistant",
          content: "I couldn't connect right now. Try again in a moment.",
          createdAt: new Date(), status: "error",
          retryPayload: trimmed,
        },
      ]);
    }
  }, [isStreaming, messages, ensureConversation, streamResponse]);

  const retryLast = useCallback(async () => {
    const text = lastUserTextRef.current;
    if (!text) return;
    setMessages((prev) => prev.filter((m) => m.status !== "error"));
    await sendMessage(text);
  }, [sendMessage]);

  const loadConversation = useCallback(async (id: string) => {
    setIsLoading(true);
    const res  = await fetch(`/api/conversations/${id}`);
    const data = await res.json();
    setConversationId(data.conversation.id);
    setConversationTitle(data.conversation.title);
    setMessages((data.messages ?? []).map(toChatMessage));
    await fetch(`/api/conversations/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ set_active: true }),
    });
    setIsLoading(false);
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
