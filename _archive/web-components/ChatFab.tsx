"use client";

/**
 * UnifiedFab — Single floating action button for both quick-add and chat.
 *
 * Default: compact 48px accent bubble with "+" icon.
 * Tap: expands to show two actions — "Add" (opens QuickAddSheet) and "Chat" (navigates to /chat).
 * Tap outside or auto-collapse: returns to compact state.
 *
 * Renders its own QuickAddSheet for creating new items from any page.
 * On the Today page, new items appear instantly via the todayItemCreated / todayRefresh events.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { space, color, radius, shadow, motion as m, textStyle } from "@/lib/design/tokens";
import QuickAddSheet from "@/components/QuickAddSheet";

export default function ChatFab() {
  const [expanded, setExpanded] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const router = useRouter();
  const fabRef = useRef<HTMLDivElement>(null);

  const handleAdd = useCallback(() => {
    setExpanded(false);
    setSheetOpen(true);
  }, []);

  const handleChat = useCallback(() => {
    setExpanded(false);
    router.push("/chat");
  }, [router]);

  const handleCreated = useCallback(() => {
    window.dispatchEvent(new CustomEvent("meridian:todayRefresh"));
  }, []);

  // Close menu on outside tap
  useEffect(() => {
    if (!expanded) return;
    function handleOutside(e: PointerEvent) {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    }
    const timer = setTimeout(() => {
      document.addEventListener("pointerdown", handleOutside);
    }, 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointerdown", handleOutside);
    };
  }, [expanded]);

  // Auto-collapse after 3.5s
  useEffect(() => {
    if (!expanded) return;
    const timer = setTimeout(() => setExpanded(false), 3500);
    return () => clearTimeout(timer);
  }, [expanded]);

  return (
    <>
      <div
        ref={fabRef}
        style={{
          position: "fixed",
          bottom: `calc(60px + env(safe-area-inset-bottom, 0px) + ${space[3]}px)`,
          right: space[4],
          zIndex: 40,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: space[2],
        }}
      >
        {/* Expanded action buttons */}
        <AnimatePresence>
          {expanded && (
            <>
              {/* Chat action */}
              <motion.button
                key="chat-action"
                initial={{ opacity: 0, scale: 0.6, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.6, y: 10 }}
                transition={{ ...m.spring.snappy, delay: 0.04 }}
                whileTap={{ scale: 0.92 }}
                onClick={handleChat}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: space[2],
                  height: 40,
                  padding: `0 ${space[4]}px 0 ${space[3]}px`,
                  borderRadius: radius.full,
                  background: "rgba(255,255,255,0.97)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  border: `1px solid rgba(108,105,224,0.10)`,
                  boxShadow: `0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(108,105,224,0.08)`,
                  cursor: "pointer",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color.accent} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span style={{ ...textStyle("caption"), color: color.ink, fontWeight: 500 }}>
                  Chat
                </span>
              </motion.button>

              {/* Add action */}
              <motion.button
                key="add-action"
                initial={{ opacity: 0, scale: 0.6, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.6, y: 10 }}
                transition={m.spring.snappy}
                whileTap={{ scale: 0.92 }}
                onClick={handleAdd}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: space[2],
                  height: 40,
                  padding: `0 ${space[4]}px 0 ${space[3]}px`,
                  borderRadius: radius.full,
                  background: "rgba(255,255,255,0.97)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  border: `1px solid rgba(108,105,224,0.10)`,
                  boxShadow: `0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(108,105,224,0.08)`,
                  cursor: "pointer",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color.accent} strokeWidth={2} strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span style={{ ...textStyle("caption"), color: color.ink, fontWeight: 500 }}>
                  Add item
                </span>
              </motion.button>
            </>
          )}
        </AnimatePresence>

        {/* Main FAB */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setExpanded((p) => !p)}
          aria-label={expanded ? "Close menu" : "Open menu"}
          style={{
            width: 48,
            height: 48,
            borderRadius: radius.full,
            background: color.accent,
            border: "none",
            boxShadow: `0 3px 12px rgba(108,105,224,0.3), 0 1px 4px rgba(0,0,0,0.08)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <motion.svg
            animate={{ rotate: expanded ? 45 : 0 }}
            transition={m.spring.snappy}
            width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </motion.svg>
        </motion.button>
      </div>

      {/* QuickAddSheet for creating new items */}
      <QuickAddSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onCreated={handleCreated}
        editTarget={null}
      />
    </>
  );
}
