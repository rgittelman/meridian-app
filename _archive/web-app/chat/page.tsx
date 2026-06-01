"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useConversation } from "@/lib/hooks/use-conversation";
import ChatInput from "@/components/ChatInput";
import ChatMessageBubble from "@/components/chat/ChatMessageBubble";
import ThinkingIndicator from "@/components/chat/ThinkingIndicator";
import GreetingArea from "@/components/chat/GreetingArea";
import ConversationHistory from "@/components/chat/ConversationHistory";
import ChatDevBar from "@/components/chat/ChatDevBar";

export default function ChatPage() {
  const { loading: authLoading } = useAuth({ required: true });
  const {
    messages, conversationId, isStreaming, isLoading,
    memoryMeta, sendMessage, retryLast,
    loadConversation, startNewChat, deleteConversation, userName,
  } = useConversation();

  const [historyOpen, setHistoryOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
  }, []);

  useEffect(() => { if (!isLoading) scrollToBottom(false); }, [isLoading, scrollToBottom]);
  useEffect(() => { scrollToBottom(true); }, [messages, isStreaming, scrollToBottom]);

  const hasUserMessage = messages.some((m) => m.role === "user");

  if (authLoading || isLoading) {
    return (
      <div style={{
        height: "100dvh", background: "#F7F6FA",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <ThinkingIndicator />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        height: "100dvh",
        background: "#F7F6FA",
        paddingBottom: "calc(60px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      {/* Header */}
      <header
        className="shrink-0 flex items-center justify-between max-w-lg mx-auto w-full"
        style={{
          height: 52, padding: "0 18px",
          borderBottom: "1px solid rgba(0,0,0,0.04)",
          background: "rgba(247,246,250,0.92)",
          backdropFilter: "blur(12px)",
        }}
      >
        <span style={{ fontSize: 12, letterSpacing: "0.14em", color: "#A8A6BC" }}>
          meridian
        </span>
        <button
          aria-label="Conversation history"
          onClick={() => setHistoryOpen(true)}
          style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "rgba(0,0,0,0.04)", border: "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9E9CB0" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </button>
      </header>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="px-4 max-w-lg mx-auto" style={{ paddingTop: 12, paddingBottom: 8 }}>
          {!hasUserMessage && (
            <GreetingArea userName={userName} onAction={sendMessage} />
          )}

          <div className="flex flex-col">
            {messages.map((msg, i) => {
              const prev    = messages[i - 1];
              const next    = messages[i + 1];
              const isFirst = !prev || prev.role !== msg.role;
              const isLast  = !next || next.role !== msg.role;
              let mt = i === 0 ? 0 : isFirst ? 18 : 3;

              return (
                <ChatMessageBubble
                  key={msg.id}
                  message={msg}
                  isFirst={isFirst}
                  isLast={isLast}
                  marginTop={mt}
                  onRetry={msg.status === "error" ? retryLast : undefined}
                />
              );
            })}

            {/* Thinking dots now render inside the streaming assistant bubble */}
          </div>

          <div ref={bottomRef} style={{ height: 8 }} />
        </div>
      </div>

      {/* Dev bar */}
      <ChatDevBar
        memoryCount={memoryMeta.count}
        memoryIds={memoryMeta.ids}
        provider={memoryMeta.provider}
        toneState={memoryMeta.toneState}
        patternCount={memoryMeta.patternCount}
      />

      {/* Composer — keyboard-safe */}
      <div
        className="shrink-0"
        style={{
          background: "rgba(247,246,250,0.94)",
          backdropFilter: "blur(16px)",
          borderTop: "1px solid rgba(0,0,0,0.04)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <ChatInput
          onSend={sendMessage}
          disabled={isStreaming}
          messageCount={messages.length}
        />
      </div>

      {/* History sheet */}
      <ConversationHistory
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelect={loadConversation}
        onNewChat={startNewChat}
        onDelete={deleteConversation}
        activeId={conversationId}
      />
    </div>
  );
}
