"use client";

/**
 * Meridian Design Primitives — Canonical reusable components.
 *
 * These are the building blocks for all UI. Every screen should compose
 * from these rather than ad-hoc inline styles.
 */

import { type ReactNode, type CSSProperties, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  space, font, textStyle, color, shadow, radius, motion as m,
  type FontStyle,
} from "./tokens";

// ── Text ─────────────────────────────────────────────────────────────────────

interface TextProps {
  as?: "p" | "span" | "h1" | "h2" | "h3" | "label" | "div";
  style?: FontStyle;
  color?: string;
  align?: CSSProperties["textAlign"];
  truncate?: boolean;
  strike?: boolean;
  className?: string;
  children: ReactNode;
  css?: CSSProperties;
}

export function Text({
  as: Tag = "span",
  style: fontStyle = "body",
  color: textColor,
  align,
  truncate,
  strike,
  className,
  children,
  css,
}: TextProps) {
  return (
    <Tag
      className={className}
      style={{
        margin: 0,
        ...textStyle(fontStyle),
        color: textColor,
        textAlign: align,
        ...(truncate ? { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const } : {}),
        ...(strike ? { textDecoration: "line-through", textDecorationColor: "rgba(184,182,204,0.4)" } : {}),
        ...css,
      }}
    >
      {children}
    </Tag>
  );
}

// ── Surface (Card) ───────────────────────────────────────────────────────────

interface SurfaceProps {
  elevation?: keyof typeof shadow;
  rounded?: keyof typeof radius;
  bg?: string;
  border?: boolean;
  padding?: keyof typeof space;
  className?: string;
  children: ReactNode;
  css?: CSSProperties;
  onClick?: () => void;
}

export function Surface({
  elevation = "card",
  rounded = "lg",
  bg = color.surface,
  border = true,
  padding,
  className,
  children,
  css,
  onClick,
}: SurfaceProps) {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        background: bg,
        borderRadius: radius[rounded],
        boxShadow: shadow[elevation],
        border: border ? `1px solid ${color.borderSubtle}` : "none",
        overflow: "hidden",
        ...(padding !== undefined ? { padding: space[padding] } : {}),
        ...(onClick ? { cursor: "pointer" } : {}),
        ...css,
      }}
    >
      {children}
    </div>
  );
}

// ── Section (label + content) ────────────────────────────────────────────────

interface SectionProps {
  label: string;
  labelColor?: string;
  suffix?: ReactNode;
  children: ReactNode;
  css?: CSSProperties;
}

export function Section({ label, labelColor = color.tertiary, suffix, children, css }: SectionProps) {
  return (
    <section style={{ marginBottom: space[2], ...css }}>
      <div style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        paddingLeft: space[1],
        paddingRight: space[1],
        marginBottom: space[2],
      }}>
        <Text style="caption" color={labelColor}>{label}</Text>
        {suffix}
      </div>
      {children}
    </section>
  );
}

// ── Row (standard list item) ─────────────────────────────────────────────────

interface RowProps {
  leading?: ReactNode;
  trailing?: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  divider?: boolean;
  css?: CSSProperties;
}

export function Row({ leading, trailing, children, onClick, divider, css }: RowProps) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: space[3],
        padding: `${space[3]}px ${space[4]}px`,
        borderBottom: divider ? `1px solid ${color.borderSubtle}` : "none",
        cursor: onClick ? "pointer" : undefined,
        ...css,
      }}
    >
      {leading}
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      {trailing}
    </div>
  );
}

// ── IconChip ─────────────────────────────────────────────────────────────────

interface IconChipProps {
  bg: string;
  size?: number;
  rounded?: keyof typeof radius;
  children: ReactNode;
}

export function IconChip({ bg, size = 32, rounded = "sm", children }: IconChipProps) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: radius[rounded],
      background: bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}>
      {children}
    </div>
  );
}

// ── Dot (kind indicator) ─────────────────────────────────────────────────────

export function KindDot({ color: c, size = 7 }: { color: string; size?: number }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: size / 3,
      background: c,
      opacity: 0.55,
      flexShrink: 0,
    }} />
  );
}

// ── CheckCircle ──────────────────────────────────────────────────────────────

interface CheckCircleProps {
  checked: boolean;
  onToggle: () => void;
  accentColor?: string;
  completing?: boolean;
}

export function CheckCircle({ checked, onToggle, accentColor = color.accent, completing }: CheckCircleProps) {
  const active = checked || completing;
  return (
    <motion.button
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      aria-label={checked ? "Reopen" : "Mark complete"}
      whileTap={{ scale: 0.85 }}
      animate={completing ? { scale: [1, 1.15, 1] } : {}}
      transition={m.spring.gentle}
      style={{
        width: 22,
        height: 22,
        borderRadius: radius.full,
        flexShrink: 0,
        border: active ? "none" : `1.5px solid rgba(0,0,0,0.12)`,
        background: active ? accentColor : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        padding: 0,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <AnimatePresence>
        {active && (
          <motion.svg
            key="check"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={m.spring.bouncy}
            width="11" height="11" viewBox="0 0 24 24" fill="none"
            stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </motion.svg>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// ── Animated list wrapper ────────────────────────────────────────────────────

export const MotionList = forwardRef<HTMLDivElement, { children: ReactNode; className?: string }>(
  function MotionList({ children, className }, ref) {
    return (
      <motion.div
        ref={ref}
        className={className}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{ display: "flex", flexDirection: "column" }}
      >
        {children}
      </motion.div>
    );
  },
);

export function MotionItem({ children, index = 0, css }: { children: ReactNode; index?: number; css?: CSSProperties }) {
  return (
    <motion.div
      layout
      variants={m.listItem}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ ...m.spring.gentle, delay: index * 0.03 }}
      style={css}
    >
      {children}
    </motion.div>
  );
}

// ── Pill button ──────────────────────────────────────────────────────────────

interface PillButtonProps {
  label: string;
  color?: string;
  bg?: string;
  onClick: (e: React.MouseEvent) => void;
  size?: "sm" | "md";
}

export function PillButton({ label, color: c = color.accent, bg, onClick, size = "sm" }: PillButtonProps) {
  const isSmall = size === "sm";
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      style={{
        background: bg ?? `${c}0F`,
        border: "none",
        cursor: "pointer",
        fontSize: isSmall ? font.footnote.size : font.caption.size,
        fontWeight: isSmall ? 600 : 600,
        color: c,
        padding: isSmall ? `${space[1]}px ${space[3]}px` : `${space[2]}px ${space[4]}px`,
        borderRadius: radius.full,
        minHeight: isSmall ? 28 : 34,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {label}
    </motion.button>
  );
}

// ── Backdrop overlay ─────────────────────────────────────────────────────────

export function Backdrop({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={m.ease.fast}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.18)",
      }}
    />
  );
}
