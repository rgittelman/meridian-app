"use client";

import { useState, useEffect } from "react";
import MarkdownContent from "./MarkdownContent";
import type { ChatMessage } from "@/types";

// ─── Confirmation card detection ──────────────────────────────────────────────

const CONFIRM_RE = /^(Reminder|Task|Event) saved: "(.+?)"([\s\S]*)\.$/;

function parseConfirmation(content: string): { kind: string; title: string; when: string } | null {
  const match = content.match(CONFIRM_RE);
  if (!match) return null;
  return { kind: match[1], title: match[2], when: match[3].replace(/^\s*[—–-]\s*/, "").trim() };
}

const KIND_COLORS: Record<string, { bg: string; fg: string; icon: string }> = {
  Reminder: { bg: "rgba(212,154,58,0.06)", fg: "#D49A3A", icon: "🔔" },
  Task:     { bg: "rgba(108,105,224,0.06)", fg: "#6C69E0", icon: "✓" },
  Event:    { bg: "rgba(91,168,138,0.06)",  fg: "#5BA88A", icon: "📅" },
};

function ConfirmationCard({ kind, title, when }: { kind: string; title: string; when: string }) {
  const style = KIND_COLORS[kind] ?? KIND_COLORS.Task;
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setChecked(true), 150);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      background: style.bg,
      border: `1px solid ${style.fg}18`,
      borderRadius: 16,
      padding: "14px 16px",
      display: "flex",
      alignItems: "flex-start",
      gap: 10,
    }}>
      {/* Animated check circle */}
      <div style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: checked ? style.fg : "transparent",
        border: checked ? "none" : `2px solid ${style.fg}44`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        transition: "all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
        transform: checked ? "scale(1)" : "scale(0.8)",
        marginTop: 1,
      }}>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"
          style={{
            opacity: checked ? 1 : 0,
            transition: "opacity 0.2s ease 0.15s",
          }}
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 14, fontWeight: 600, color: style.fg,
          margin: 0, lineHeight: 1.3,
          letterSpacing: "0.01em",
        }}>
          {kind} saved
        </p>
        <p style={{
          fontSize: 15, color: "#2C2B3D", margin: "3px 0 0",
          lineHeight: 1.4, fontWeight: 500,
        }}>
          {title}
        </p>
        {when && (
          <p style={{
            fontSize: 12, color: "#A09EB4", margin: "4px 0 0",
            lineHeight: 1.3,
          }}>
            {when}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Bubble radius (iMessage-style) ───────────────────────────────────────────

function userRadius(isFirst: boolean, isLast: boolean): string {
  if (isFirst && isLast) return "18px 18px 4px 18px";
  if (isFirst)           return "18px 18px 6px 18px";
  if (isLast)            return "18px 18px 4px 18px";
  return                        "18px 18px 6px 18px";
}

function aiRadius(isFirst: boolean, isLast: boolean): string {
  if (isFirst && isLast) return "4px 18px 18px 18px";
  if (isFirst)           return "18px 18px 18px 6px";
  if (isLast)            return "4px 18px 18px 18px";
  return                        "18px 18px 18px 6px";
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

interface ChatMessageBubbleProps {
  message:   ChatMessage;
  isFirst:   boolean;
  isLast:    boolean;
  marginTop: number;
  onRetry?:  () => void;
}

export default function ChatMessageBubble({
  message,
  isFirst,
  isLast,
  marginTop,
  onRetry,
}: ChatMessageBubbleProps) {
  const isUser = message.role === "user";
  const isError = message.status === "error";
  const isSending = message.status === "sending";

  if (isUser) {
    return (
      <div className="flex flex-col items-end" style={{ marginTop, opacity: isSending ? 0.55 : 1, transition: "opacity 0.2s ease", animation: "fade-up 0.2s ease both" }}>
        <div style={{
          background: "#6C69E0", color: "#FFFFFF",
          fontSize: 16, lineHeight: 1.5,
          padding: "11px 16px",
          borderRadius: userRadius(isFirst, isLast),
          maxWidth: "75%",
          letterSpacing: "-0.01em",
          wordBreak: "break-word",
        }}>
          {message.content}
        </div>
        {isLast && (
          <span style={{ fontSize: 11, color: "#C8C6D8", marginTop: 5 }}>
            {isSending ? "Sending…" : formatTime(message.createdAt)}
          </span>
        )}
      </div>
    );
  }

  const confirmation = !isError && message.content ? parseConfirmation(message.content) : null;

  return (
    <div className="flex flex-col items-start" style={{ marginTop, animation: "fade-up 0.25s ease both" }}>
      <div style={{
        background: isError ? "#FFF7F7" : confirmation ? "transparent" : "#FFFFFF",
        borderRadius: aiRadius(isFirst, isLast),
        border: isError ? "1px solid rgba(212,99,92,0.15)" : confirmation ? "none" : "1px solid rgba(0,0,0,0.04)",
        boxShadow: confirmation ? "none" : "0 1px 3px rgba(0,0,0,0.025)",
        maxWidth: "82%",
        overflow: "hidden",
        wordBreak: "break-word",
        padding: confirmation ? 0 : "11px 16px",
      }}>
        {isError ? (
          <p style={{ fontSize: 15, color: "#9E9CB0", lineHeight: 1.5, margin: 0 }}>
            {message.content || "Something went wrong."}
          </p>
        ) : confirmation ? (
          <ConfirmationCard kind={confirmation.kind} title={confirmation.title} when={confirmation.when} />
        ) : message.status === "streaming" && !message.content ? (
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 0", minHeight: 11 }}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  width: 6, height: 6, borderRadius: "50%", background: "#C8C6D8",
                  display: "block",
                  animation: `pulse-dot 1.2s ease-in-out ${i * 0.22}s infinite`,
                }}
              />
            ))}
          </div>
        ) : (
          <MarkdownContent
            content={message.content}
            style={{ fontSize: 16, color: "#2C2B3D", letterSpacing: "-0.01em" }}
          />
        )}

        {isError && onRetry && (
          <button
            onClick={onRetry}
            className="tap-scale"
            style={{
              marginTop: 10, fontSize: 14, fontWeight: 500,
              color: "#6C69E0", background: "rgba(108,105,224,0.06)",
              border: "1px solid rgba(108,105,224,0.12)",
              borderRadius: 20, padding: "8px 20px", cursor: "pointer",
              minHeight: 36,
            }}
          >
            Try again
          </button>
        )}
      </div>
      {isLast && !isError && message.content && (
        <span style={{ fontSize: 11, color: "#C8C6D8", marginTop: 5, paddingLeft: 2 }}>
          {formatTime(message.createdAt)}
        </span>
      )}
    </div>
  );
}
