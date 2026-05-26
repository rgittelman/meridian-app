"use client";

import MarkdownContent from "./MarkdownContent";
import type { ChatMessage } from "@/types";

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
      <div className="flex flex-col items-end" style={{ marginTop, opacity: isSending ? 0.6 : 1, transition: "opacity 0.15s ease", animation: "fade-up 0.2s ease both" }}>
        <div style={{
          background: "#6C69E0", color: "#FFFFFF",
          fontSize: 16, lineHeight: 1.5,
          padding: "10px 15px",
          borderRadius: userRadius(isFirst, isLast),
          maxWidth: "75%",
          letterSpacing: "-0.01em",
          wordBreak: "break-word",
        }}>
          {message.content}
        </div>
        {isLast && (
          <span style={{ fontSize: 11, color: "#C4C2D4", marginTop: 4 }}>
            {isSending ? "Sending…" : formatTime(message.createdAt)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start" style={{ marginTop, animation: "fade-up 0.25s ease both" }}>
      <div style={{
        background: isError ? "#FFF5F5" : "#FFFFFF",
        borderRadius: aiRadius(isFirst, isLast),
        border: isError ? "1px solid rgba(224,62,62,0.2)" : "1px solid rgba(0,0,0,0.07)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        maxWidth: "82%",
        overflow: "hidden",
        wordBreak: "break-word",
        padding: "10px 15px",
      }}>
        {isError ? (
          <p style={{ fontSize: 15, color: "#9E9CB0", lineHeight: 1.5, margin: 0 }}>
            {message.content || "Something went wrong."}
          </p>
        ) : message.status === "streaming" && !message.content ? (
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 0", minHeight: 11 }}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  width: 7, height: 7, borderRadius: "50%", background: "#C4C2D4",
                  display: "block",
                  animation: `pulse-dot 1.2s ease-in-out ${i * 0.22}s infinite`,
                }}
              />
            ))}
          </div>
        ) : (
          <MarkdownContent
            content={message.content}
            style={{ fontSize: 16, color: "#1C1A2E", letterSpacing: "-0.01em" }}
          />
        )}

        {isError && onRetry && (
          <button
            onClick={onRetry}
            className="tap-scale"
            style={{
              marginTop: 8, fontSize: 14, fontWeight: 600,
              color: "#6C69E0", background: "rgba(108,105,224,0.08)",
              border: "1px solid rgba(108,105,224,0.15)",
              borderRadius: 18, padding: "8px 18px", cursor: "pointer",
              minHeight: 36,
            }}
          >
            Try again
          </button>
        )}
      </div>
      {isLast && !isError && message.content && (
        <span style={{ fontSize: 11, color: "#C4C2D4", marginTop: 4, paddingLeft: 2 }}>
          {formatTime(message.createdAt)}
        </span>
      )}
    </div>
  );
}
