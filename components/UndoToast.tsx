"use client";

/**
 * UndoToast — Minimal undo snackbar for destructive actions.
 * Auto-dismisses after timeout. Shows one at a time.
 */

import { useState, useEffect, useCallback, useRef } from "react";

export interface UndoAction {
  id:      string;
  label:   string;
  onUndo:  () => void;
}

interface UndoToastProps {
  action: UndoAction | null;
  duration?: number;
}

export default function UndoToast({ action, duration = 4000 }: UndoToastProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (action) {
      setVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(false), duration);
    } else {
      setVisible(false);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [action, duration]);

  const handleUndo = useCallback(() => {
    if (!action) return;
    action.onUndo();
    setVisible(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, [action]);

  if (!visible || !action) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "calc(60px + env(safe-area-inset-bottom, 0px) + 14px)",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 80,
        background: "#1C1A2E",
        color: "#FFFFFF",
        borderRadius: 14,
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
        animation: "fade-up 0.2s ease both",
        maxWidth: "calc(100% - 40px)",
        width: "auto",
      }}
    >
      <span style={{ fontSize: 14, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {action.label}
      </span>
      <button
        onClick={handleUndo}
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: "#A8A6FF", fontSize: 14, fontWeight: 700,
          padding: "4px 8px", flexShrink: 0,
        }}
      >
        Undo
      </button>
    </div>
  );
}
