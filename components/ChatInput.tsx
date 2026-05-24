"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [value,   setValue]   = useState("");
  const [focused, setFocused] = useState(false);
  const [pulse,   setPulse]   = useState(false); // signature send moment
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasText = value.trim().length > 0;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 152)}px`;
  }, [value]);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;

    // Pulse the pill on send — subconscious signature moment
    setPulse(true);
    setTimeout(() => setPulse(false), 380);

    onSend(trimmed);
    setValue("");

    // Preserve keyboard / focus continuity — critical for conversation flow
    requestAnimationFrame(() => {
      requestAnimationFrame(() => textareaRef.current?.focus());
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  // Three-state shadow: resting → focused → pulse (send moment)
  const pillShadow = pulse
    ? "0 2px 20px rgba(16,10,4,0.14), 0 0 0 2px rgba(150,146,180,0.32), 0 0 36px rgba(150,146,180,0.14)"
    : focused
    ? "0 2px 16px rgba(16,10,4,0.10), 0 0 0 1.5px rgba(150,146,180,0.20), 0 0 24px rgba(150,146,180,0.07)"
    : "0 1px 6px rgba(16,10,4,0.07), 0 1px 2px rgba(16,10,4,0.05)";

  return (
    /*
      Composer sits on the same warm bg as the conversation — not inside the
      dark nav zone. The conversation remains the primary space; the nav is
      the grounding floor below, not the container for the input.
    */
    <div style={{ background: "var(--bg)" }} className="pb-safe">
      {/* Soft dissolve from messages into the composer — no hard edge */}
      <div
        className="h-10 w-full pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, transparent, var(--bg))",
          marginBottom: -6,
          position: "relative",
          zIndex: 1,
        }}
      />

      <div className="px-4 pb-4 pt-0 max-w-lg mx-auto">
        <div className="flex items-end gap-2.5">

          {/* Pill — symmetric padding, no internal gutter */}
          <div
            className="flex-1 rounded-[26px] px-5 transition-shadow duration-250"
            style={{
              background: "var(--surface)",
              boxShadow: pillShadow,
            }}
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              disabled={disabled}
              placeholder="What's on your mind?"
              className="w-full resize-none bg-transparent py-[14px] text-[15px] focus:outline-none leading-relaxed block"
              style={{
                color: "var(--ink)",
                caretColor: "var(--nav-active)",
              }}
            />
          </div>

          {/* Send — outside the pill, always occupies layout space */}
          <button
            onClick={submit}
            disabled={disabled || !hasText}
            aria-label="Send"
            className="flex-none w-9 h-9 rounded-full flex items-center justify-center"
            style={{
              background: "var(--ink)",
              opacity: hasText ? 1 : 0,
              transform: hasText ? "scale(1)" : "scale(0.68)",
              pointerEvents: hasText ? "auto" : "none",
              transition: "opacity 0.18s ease, transform 0.18s ease",
              alignSelf: "flex-end",
              marginBottom: 4,
            }}
          >
            <ArrowUpIcon />
          </button>

        </div>
      </div>
    </div>
  );
}

function ArrowUpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}
