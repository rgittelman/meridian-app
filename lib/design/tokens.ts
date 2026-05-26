/**
 * Meridian Design System — Canonical tokens.
 *
 * Single source of truth for typography, spacing, color, elevation,
 * geometry, and motion. Every visual decision flows from here.
 *
 * Inspired by Things 3, Todoist, Microsoft To Do, Tiimo, Any.do.
 * Target feel: calm, tactile, emotionally intelligent, premium.
 */

// ── Spacing scale (strict 4px grid) ─────────────────────────────────────────

export const space = {
  0:  0,
  1:  4,
  2:  8,
  3:  12,
  4:  16,
  5:  20,
  6:  24,
  8:  32,
  10: 40,
  12: 48,
} as const;

// ── Typography ───────────────────────────────────────────────────────────────

export const font = {
  family: `-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif`,

  display:   { size: 22, weight: 700, leading: 1.15, tracking: -0.025 },
  heading:   { size: 17, weight: 650, leading: 1.25, tracking: -0.018 },
  subhead:   { size: 15, weight: 600, leading: 1.3,  tracking: -0.01  },
  body:      { size: 15, weight: 400, leading: 1.5,  tracking: -0.008 },
  callout:   { size: 14, weight: 500, leading: 1.4,  tracking: -0.006 },
  caption:   { size: 13, weight: 500, leading: 1.35, tracking: 0      },
  footnote:  { size: 12, weight: 500, leading: 1.3,  tracking: 0.005  },
  micro:     { size: 11, weight: 600, leading: 1.2,  tracking: 0.01   },
} as const;

export type FontStyle = keyof typeof font extends "family" ? never : Exclude<keyof typeof font, "family">;

export function textStyle(style: FontStyle): React.CSSProperties {
  const s = font[style];
  return {
    fontSize: s.size,
    fontWeight: s.weight,
    lineHeight: s.leading,
    letterSpacing: `${s.tracking}em`,
  };
}

// ── Colors ───────────────────────────────────────────────────────────────────

export const color = {
  // Surfaces
  canvas:     "#F8F7FB",
  surface:    "#FFFFFF",
  surfaceAlt: "#F5F4FA",
  elevated:   "#F0EEFA",
  recessed:   "#F3F2F8",

  // Text
  ink:        "#2C2B3D",
  secondary:  "#6E6D82",
  tertiary:   "#A09EB4",
  ghost:      "#C8C6D8",
  placeholder:"#B8B6CC",

  // Borders
  border:       "rgba(0,0,0,0.05)",
  borderSubtle: "rgba(0,0,0,0.03)",

  // Accent — soft indigo
  accent:       "#6C69E0",
  accentSoft:   "rgba(108,105,224,0.08)",
  accentMuted:  "rgba(108,105,224,0.15)",
  accentBorder: "rgba(108,105,224,0.20)",

  // Semantic
  success:      "#5BA88A",
  successSoft:  "rgba(91,168,138,0.08)",
  warning:      "#D49A3A",
  warningSoft:  "rgba(212,154,58,0.08)",
  overdue:      "#C9736C",
  overdueSoft:  "rgba(201,115,108,0.06)",
  destructive:  "#D4635C",
  destructiveSoft: "rgba(212,99,92,0.08)",

  // Calm / inactive
  calm:         "#EAE9F5",
  inactive:     "#DDDBE8",
} as const;

// ── Elevation (layered shadows) ──────────────────────────────────────────────

export const shadow = {
  none:    "none",
  subtle:  "0 1px 2px rgba(0,0,0,0.02), 0 2px 8px rgba(0,0,0,0.02)",
  card:    "0 1px 3px rgba(0,0,0,0.02), 0 4px 16px rgba(0,0,0,0.025)",
  raised:  "0 2px 6px rgba(0,0,0,0.03), 0 8px 32px rgba(0,0,0,0.045)",
  overlay: "0 4px 12px rgba(0,0,0,0.04), 0 16px 48px rgba(0,0,0,0.07)",
  nav:     "0 -1px 0 rgba(0,0,0,0.03), 0 -6px 32px rgba(0,0,0,0.04)",
} as const;

// ── Geometry ─────────────────────────────────────────────────────────────────

export const radius = {
  xs:     8,
  sm:    12,
  md:    16,
  lg:    20,
  xl:    24,
  full: 9999,
} as const;

// ── Motion (Framer Motion presets) ────────────────────────────────────────────

export const motion = {
  spring: {
    gentle:  { type: "spring" as const, stiffness: 200, damping: 24, mass: 0.8 },
    snappy:  { type: "spring" as const, stiffness: 400, damping: 30, mass: 0.6 },
    bouncy:  { type: "spring" as const, stiffness: 300, damping: 20, mass: 0.8 },
  },

  ease: {
    default: { duration: 0.25, ease: [0.25, 1, 0.5, 1] as const },
    slow:    { duration: 0.4,  ease: [0.25, 1, 0.5, 1] as const },
    fast:    { duration: 0.15, ease: [0.25, 1, 0.5, 1] as const },
  },

  // Common animation variants for Framer Motion
  fadeUp: {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    exit:    { opacity: 0, y: -4 },
  },

  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit:    { opacity: 0 },
  },

  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit:    { opacity: 0, scale: 0.97 },
  },

  slideUp: {
    initial: { y: "100%" },
    animate: { y: 0 },
    exit:    { y: "100%" },
  },

  listItem: {
    initial: { opacity: 0, x: -8 },
    animate: { opacity: 1, x: 0 },
    exit:    { opacity: 0, x: 12, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 },
  },
} as const;

// Stagger children helper
export function stagger(staggerMs = 40) {
  return {
    animate: { transition: { staggerChildren: staggerMs / 1000 } },
  };
}

// ── Item kind colors (task, reminder, event) ─────────────────────────────────

export const kindColor = {
  task:     { dot: color.accent,  bg: color.accentSoft,  text: color.accent  },
  reminder: { dot: color.warning, bg: color.warningSoft, text: color.warning },
  event:    { dot: color.success, bg: color.successSoft, text: color.success },
} as const;

// ── Date bucket styling ──────────────────────────────────────────────────────

export const bucketStyle = {
  overdue:   { label: color.overdue,   opacity: 1    },
  today:     { label: color.ink,       opacity: 1    },
  tomorrow:  { label: color.secondary, opacity: 1    },
  this_week: { label: color.tertiary,  opacity: 0.95 },
  later:     { label: color.ghost,     opacity: 0.88 },
  no_date:   { label: color.ghost,     opacity: 0.88 },
} as const;
