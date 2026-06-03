/**
 * Gradient token definitions.
 *
 * Used by GradientBackground and GradientIcon once expo-linear-gradient
 * is installed (Phase V1.2). Pre-defined here so V1.3 screen rewrites
 * can reference them without hunting for color values.
 *
 * The MomentumRing already uses react-native-svg LinearGradient inline —
 * its stop colors are driven by the AppColors ring tokens, not these defs.
 */

export type GradientDef = {
  colors: readonly [string, string, ...string[]];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
};

const TOP_TO_BOTTOM = { start: { x: 0, y: 0 }, end: { x: 0, y: 1 } } as const;
const DIAGONAL      = { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } } as const;

export const gradients = {
  // ── Screen background gradients (very subtle — dark base with tab-tinted bottom) ──
  focusBackground: {
    colors: ['#0D0B1A', '#170F1E'] as const,
    ...TOP_TO_BOTTOM,
  },
  planBackground: {
    colors: ['#0D0B1A', '#0F0D20'] as const,
    ...TOP_TO_BOTTOM,
  },
  lifeBackground: {
    colors: ['#0D0B1A', '#0C1419'] as const,
    ...TOP_TO_BOTTOM,
  },
  captureBackground: {
    colors: ['#0D0B1A', '#15101F'] as const,
    ...TOP_TO_BOTTOM,
  },

  // ── Ring / progress gradients ──────────────────────────────────────────────
  focusRing: {
    colors: ['#FB923C', '#F59E0B'] as const,
    ...DIAGONAL,
  },
  planRing: {
    colors: ['#7B6FE8', '#3B82F6'] as const,
    ...DIAGONAL,
  },
  lifeRing: {
    colors: ['#10B981', '#34D399'] as const,
    ...DIAGONAL,
  },

  // ── Card overlays ──────────────────────────────────────────────────────────
  glassCard: {
    colors: ['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.025)'] as const,
    ...TOP_TO_BOTTOM,
  },

  // ── Icon gradients (for GradientIcon, Phase V1.2) ─────────────────────────
  iconFocus: {
    colors: ['#F97316', '#F59E0B'] as const,
    ...DIAGONAL,
  },
  iconPlan: {
    colors: ['#7B6FE8', '#3B82F6'] as const,
    ...DIAGONAL,
  },
  iconLife: {
    colors: ['#10B981', '#3B82F6'] as const,
    ...DIAGONAL,
  },
  iconCapture: {
    colors: ['#A07AE8', '#F97316'] as const,
    ...DIAGONAL,
  },
} as const;
