"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatInputProps {
  onSend:       (text: string) => void;
  disabled?:    boolean;
  messageCount?: number;
}

// ─── Placeholders ─────────────────────────────────────────────────────────────

const PLACEHOLDERS = [
  "Ask Meridian anything…",
  "What's on your mind?",
  "What needs attention?",
  "What feels unfinished?",
  "What matters today?",
  "What's pulling at you?",
  "What needs a plan?",
  "What should I remember?",
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChatInput({
  onSend,
  disabled   = false,
  messageCount = 0,
}: ChatInputProps) {
  const [value,    setValue]   = useState("");
  const [focused,  setFocused] = useState(false);
  const [phIndex,  setPhIndex] = useState(0);
  const [phVisible, setPhVisible] = useState(true);

  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const intervalRef  = useRef<ReturnType<typeof setInterval>  | null>(null);
  const resumeRef    = useRef<ReturnType<typeof setTimeout>   | null>(null);

  const hasText = value.length > 0;

  // Randomize placeholder on mount (avoids SSR mismatch)
  useEffect(() => {
    setPhIndex(Math.floor(Math.random() * PLACEHOLDERS.length));
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [value]);

  // Restore focus when a new message lands
  useEffect(() => {
    if (messageCount > 0) textareaRef.current?.focus();
  }, [messageCount]);

  // Placeholder rotation
  const rotatePlaceholder = useCallback(() => {
    setPhVisible(false);
    setTimeout(() => {
      setPhIndex((i) => (i + 1) % PLACEHOLDERS.length);
      setPhVisible(true);
    }, 350);
  }, []);

  const startRotation = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(rotatePlaceholder, 7000);
  }, [rotatePlaceholder]);

  const stopRotation = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    startRotation();
    return () => {
      stopRotation();
      if (resumeRef.current) clearTimeout(resumeRef.current);
    };
  }, [startRotation, stopRotation]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleFocus = () => {
    setFocused(true);
    stopRotation();
  };

  const handleBlur = () => {
    setFocused(false);
    if (!hasText) {
      resumeRef.current = setTimeout(startRotation, 1500);
    }
  };

  const submit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;

    // Call focus() synchronously (mobile requirement)
    textareaRef.current?.focus();

    onSend(trimmed);
    setValue("");
  }, [value, disabled, onSend]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const handleSendTap = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    submit();
  };

  // Placeholder: hide instantly on focus or when text present
  const showPlaceholder = !hasText && !focused && phVisible;

  return (
    <div
      style={{
        width: "100%",
        background: "transparent",
      }}
    >
      <div
        style={{
          maxWidth: 480,
          margin:   "0 auto",
          padding:  "6px 14px 10px",
          display:  "flex",
          alignItems: "flex-end",
          gap:      10,
        }}
      >
        {/* ── Input pill ──────────────────────────────────────────── */}
        <div
          style={{
            flex:      1,
            position:  "relative",
            display:   "flex",
            alignItems: "flex-end",
            background: "#FFFFFF",
            borderRadius: 24,
            border: focused
              ? "1px solid rgba(108,105,224,0.30)"
              : "1px solid rgba(0,0,0,0.05)",
            boxShadow: focused
              ? "0 0 0 3px rgba(108,105,224,0.06), 0 2px 16px rgba(0,0,0,0.04)"
              : "0 2px 12px rgba(0,0,0,0.04)",
            transition: "border-color 0.25s ease, box-shadow 0.25s ease",
            minHeight:  50,
            overflow:   "hidden",
          }}
        >
          {/* Presence dot (left, vertically centered) */}
          <div
            aria-hidden
            style={{
              flexShrink: 0,
              alignSelf:  "center",
              width:  7,
              height: 7,
              borderRadius: "50%",
              marginLeft: 16,
              background: focused
                ? "rgba(108,105,224,0.90)"
                : "rgba(108,105,224,0.30)",
              transition: "background 0.3s ease",
            }}
          />

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder=""
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="sentences"
            inputMode="text"
            className="flex-1 resize-none bg-transparent focus:outline-none"
            style={{
              fontSize:    15,
              lineHeight:  1.5,
              color:       "#2C2B3D",
              caretColor:  "#6C69E0",
              padding:     "13px 10px 13px 10px",
              minHeight:   50,
              maxHeight:   140,
              overflowY:   "auto",
              WebkitAppearance: "none",
              scrollbarWidth:   "none",
            }}
          />

          {/* Placeholder overlay */}
          <div
            aria-hidden
            style={{
              position:      "absolute",
              left:          36,
              right:         72,          // leave space for action icons
              top:           "50%",
              transform:     "translateY(-50%)",
              pointerEvents: "none",
              color:         "#B0AEC4",
              fontSize:      15,
              lineHeight:    1.5,
              whiteSpace:    "nowrap",
              overflow:      "hidden",
              textOverflow:  "ellipsis",
              opacity:       showPlaceholder ? 1 : 0,
              transition:    showPlaceholder
                ? "opacity 400ms ease"
                : "opacity 80ms ease",
            }}
          >
            {PLACEHOLDERS[phIndex]}
          </div>

          {/* Action icons inside pill (right side) */}
          <div style={{ width: 10, flexShrink: 0 }} />
        </div>

        {/* ── Send button — always visible, activates on text ──────── */}
        <div
          role="button"
          aria-label="Send message"
          tabIndex={0}
          onMouseDown={(e) => e.preventDefault()}
          onTouchStart={(e) => e.preventDefault()}
          onClick={handleSendTap}
          style={{
            width:        44,
            height:       44,
            borderRadius: 14,
            background:   hasText && !disabled
              ? "#6C69E0"
              : "rgba(108,105,224,0.10)",
            display:      "flex",
            alignItems:   "center",
            justifyContent: "center",
            flexShrink:   0,
            cursor:       "pointer",
            transition:   "background 0.2s ease",
            alignSelf:    "flex-end",
            marginBottom: 2,
          }}
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke={hasText && !disabled ? "#FFFFFF" : "rgba(108,105,224,0.55)"}
            strokeWidth={2.3}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transition: "stroke 0.2s ease" }}
          >
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
        </div>
      </div>
    </div>
  );
}
