"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ChatInput from "@/components/ChatInput";
import { classify } from "@/services/classify";
import type { ChatMessage } from "@/types";

// Three seed messages — clean, shows Meridian's voice without crowding the space
const SEED_MESSAGES: ChatMessage[] = [
  {
    id: "s1",
    role: "assistant",
    content: "What would make today feel like a good day?",
    createdAt: new Date(Date.now() - 18 * 60 * 1000),
  },
  {
    id: "s2",
    role: "user",
    content: "Finishing that presentation. I've been avoiding it all week.",
    createdAt: new Date(Date.now() - 16 * 60 * 1000),
  },
  {
    id: "s3",
    role: "assistant",
    content: "Open it for 20 minutes. Don't try to finish — just get something on the page.",
    createdAt: new Date(Date.now() - 15 * 60 * 1000 + 20000),
  },
];

const STUB_REPLIES: Record<string, string[]> = {
  reminder: ["Locked in.", "Got it. I'll bring that back.", "Done."],
  health:   ["Logged.", "Good to track.", "Got it."],
  money:    ["Tracked.", "Added.", "Logged."],
  task:     ["On the list.", "Got it.", "Locked in.", "Done."],
  question: ["More on that soon.", "I'll go deeper once I'm fully connected."],
  unknown:  [
    "Got it.",
    "That tracks.",
    "Fair.",
    "Noted.",
    "Good call.",
    "Probably the better move.",
    "That sounds right.",
    "Makes tomorrow easier.",
  ],
};

function pickReply(intent: string): string {
  const pool = STUB_REPLIES[intent] ?? STUB_REPLIES.unknown;
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(SEED_MESSAGES);
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
  }, []);

  useEffect(() => { scrollToBottom(false); }, [scrollToBottom]);
  useEffect(() => { scrollToBottom(true);  }, [messages, thinking, scrollToBottom]);

  const handleSend = (text: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const thinkTimer = setTimeout(() => setThinking(true), 200);
    const { intent } = classify(text);
    const reply = pickReply(intent);
    const delay = 200 + (reply.length < 30 ? 500 : 860) + Math.random() * 240;

    setTimeout(() => {
      clearTimeout(thinkTimer);
      setThinking(true);
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: reply, createdAt: new Date() },
        ]);
        setThinking(false);
      }, 300);
    }, delay);
  };

  return (
    <div
      className="h-dvh flex flex-col overflow-hidden pb-16"
      style={{ background: "var(--bg)" }}
    >
      {/* Conversation — the primary space */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="px-5 pt-16 pb-2 max-w-lg mx-auto">
          <Stream messages={messages} thinking={thinking} bottomRef={bottomRef} />
        </div>
      </div>

      {/* Composer — naturally above the nav, on the same warm bg */}
      <div className="shrink-0">
        <ChatInput onSend={handleSend} disabled={thinking} />
      </div>
    </div>
  );
}

// ─── Conversation stream ──────────────────────────────────────────────────────

function Stream({
  messages,
  thinking,
  bottomRef,
}: {
  messages: ChatMessage[];
  thinking: boolean;
  bottomRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="flex flex-col">
      {messages.map((msg, i) => {
        const prev    = messages[i - 1];
        const next    = messages[i + 1];
        const isFirst = !prev || prev.role !== msg.role;
        const isLast  = !next || next.role !== msg.role;

        // More air between role switches; tighter within a run
        let gap = "mt-1.5";
        if (i === 0)       gap = "mt-0";
        else if (isFirst)  gap = msg.role === "assistant" ? "mt-7" : "mt-5";

        return (
          <Message key={msg.id} message={msg} isFirst={isFirst} isLast={isLast} gap={gap} />
        );
      })}

      {thinking && (
        <div className="mt-7 animate-fade-up">
          <ThinkingDots />
        </div>
      )}

      <div ref={bottomRef} className="h-8" />
    </div>
  );
}

// ─── Message ─────────────────────────────────────────────────────────────────

function Message({
  message,
  isFirst: _isFirst,
  isLast,
  gap,
}: {
  message: ChatMessage;
  isFirst: boolean;
  isLast: boolean;
  gap: string;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    /*
      User: a warm stone pill — light and calm.
      The tail on the last bubble of a run signals directionality without weight.
    */
    const radius = isLast ? "rounded-[20px] rounded-br-[5px]" : "rounded-[20px]";
    return (
      <div className={`flex justify-end ${gap} animate-fade-up`}>
        <div
          className={`max-w-[76%] px-[18px] py-[10px] text-[15px] leading-[1.55] ${radius}`}
          style={{
            background: "var(--user-message)",
            color: "var(--ink)",
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  /*
    Meridian: words appear directly on the warm page — no bubble container.
    This makes the conversation feel like a dialogue happening ON the surface,
    not inside a UI widget.
  */
  return (
    <div className={`flex justify-start ${gap} animate-fade-up`}>
      <p
        className="max-w-[88%] text-[15px] leading-[1.65]"
        style={{ color: "var(--ink-2)" }}
      >
        {message.content}
      </p>
    </div>
  );
}

// ─── Thinking indicator ───────────────────────────────────────────────────────
// Consistent with Meridian's no-bubble style — three dots on the warm page

function ThinkingDots() {
  return (
    <div className="flex justify-start">
      <div className="flex gap-[5px] items-center h-6">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-[5px] h-[5px] rounded-full animate-pulse-dot"
            style={{ background: "var(--ink-3)", animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
}
