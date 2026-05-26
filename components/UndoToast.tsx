"use client";

/**
 * UndoToast — Compact floating pill for undo actions.
 * Positioned safely above the FAB / composer / bottom nav stack.
 * Auto-dismisses. Shows one at a time.
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
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (action) {
      setExiting(false);
      setVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setExiting(true);
        setTimeout(() => setVisible(false), 200);
      }, duration);
    } else {
      setVisible(false);
      setExiting(false);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [action, duration]);

  const handleUndo = useCallback(() => {
    if (!action) return;
    action.onUndo();
    setExiting(true);
    setTimeout(() => setVisible(false), 150);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, [action]);

  if (!visible || !action) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "calc(60px + env(safe-area-inset-bottom, 0px) + 90px)",
        left: "50%",
        zIndex: 80,
        background: "rgba(44,43,61,0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        color: "#FFFFFF",
        borderRadius: 24,
        padding: "9px 10px 9px 18px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        maxWidth: "min(320px, calc(100vw - 48px))",
        width: "auto",
        transform: exiting ? "translateX(-50%) translateY(6px)" : "translateX(-50%) translateY(0)",
        opacity: exiting ? 0 : 1,
        transition: "transform 0.25s ease, opacity 0.25s ease",
        animation: exiting ? undefined : "toast-in 0.25s cubic-bezier(0.25, 1, 0.5, 1) both",
      }}
    >
      <span style={{
        fontSize: 13, fontWeight: 500, flex: 1,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        letterSpacing: "-0.01em",
      }}>
        {action.label}
      </span>
      <button
        onClick={handleUndo}
        style={{
          background: "rgba(255,255,255,0.12)",
          border: "none", cursor: "pointer",
          color: "#E0DFFF", fontSize: 12, fontWeight: 600,
          padding: "5px 14px", flexShrink: 0,
          borderRadius: 16,
          letterSpacing: "0.01em",
        }}
      >
        Undo
      </button>
    </div>
  );
}
