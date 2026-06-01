"use client";

import { useEffect, useState } from "react";
import type { Conversation } from "@/lib/conversations/types";

interface ConversationHistoryProps {
  open:        boolean;
  onClose:     () => void;
  onSelect:    (id: string) => void;
  onNewChat:   () => void;
  onDelete?:   (id: string) => void;
  activeId?:   string | null;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ConversationHistory({
  open, onClose, onSelect, onNewChat, onDelete, activeId,
}: ConversationHistoryProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/conversations")
      .then((r) => r.json())
      .then((d) => setConversations(d.conversations ?? []))
      .finally(() => setLoading(false));
  }, [open]);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setDeletingId(id);
    const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (res.ok) {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (id === activeId) onDelete?.(id);
    }
    setDeletingId(null);
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 60,
          background: "rgba(0,0,0,0.25)",
          animation: "fade-up 0.2s ease both",
        }}
      />
      {/* Sheet */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 70,
        width: "min(340px, 88vw)",
        background: "#FFFFFF",
        boxShadow: "-4px 0 24px rgba(0,0,0,0.08)",
        display: "flex", flexDirection: "column",
        animation: "fade-up 0.25s ease both",
      }}>
        <div style={{
          padding: "16px 18px", borderBottom: "1px solid rgba(0,0,0,0.06)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: "#1C1A2E" }}>History</p>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9E9CB0", fontSize: 13 }}>
            Close
          </button>
        </div>

        <div style={{ padding: "12px 18px" }}>
          <button
            onClick={() => { onNewChat(); onClose(); }}
            style={{
              width: "100%", padding: "10px", borderRadius: 12,
              background: "rgba(108,105,224,0.08)", border: "1px solid rgba(108,105,224,0.15)",
              color: "#6C69E0", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            New conversation
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 12px 24px" }}>
          {loading ? (
            <p style={{ fontSize: 13, color: "#C4C2D4", textAlign: "center", padding: 24 }}>Loading…</p>
          ) : conversations.length === 0 ? (
            <p style={{ fontSize: 13, color: "#9E9CB0", textAlign: "center", padding: 24, lineHeight: 1.5 }}>
              No conversations yet.
            </p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  marginBottom: 2,
                }}
              >
                <button
                  onClick={() => { onSelect(conv.id); onClose(); }}
                  style={{
                    flex: 1, textAlign: "left", padding: "12px 10px",
                    borderRadius: 12, border: "none", cursor: "pointer",
                    background: conv.id === activeId ? "rgba(108,105,224,0.08)" : "transparent",
                    minWidth: 0,
                  }}
                >
                  <p style={{
                    fontSize: 14, fontWeight: conv.id === activeId ? 600 : 400,
                    color: "#1C1A2E", marginBottom: 3,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {conv.title}
                  </p>
                  <p style={{ fontSize: 11, color: "#C4C2D4" }}>
                    {relativeTime(conv.updated_at)}
                  </p>
                </button>
                <button
                  onClick={(e) => handleDelete(e, conv.id)}
                  disabled={deletingId === conv.id}
                  aria-label="Delete conversation"
                  className="tap-scale"
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    padding: "10px", borderRadius: 8, flexShrink: 0,
                    opacity: deletingId === conv.id ? 0.3 : 0.4,
                    color: "#9E9CB0",
                    minWidth: 44, minHeight: 44,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
