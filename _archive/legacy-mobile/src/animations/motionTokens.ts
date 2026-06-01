/**
 * Motion tokens — emotional continuity motion (light use in scaffold).
 * Heavy transitions deferred; structure ready for Reanimated.
 */
export const motionDuration = {
  instant: 120,
  fast: 200,
  standard: 280,
  slow: 400,
} as const;

export const motionEasing = {
  /** Calm deceleration */
  out: 'cubic-bezier(0.22, 1, 0.36, 1)',
  inOut: 'cubic-bezier(0.45, 0, 0.55, 1)',
} as const;

export const springConfig = {
  gentle: { damping: 24, stiffness: 200, mass: 0.9 },
  snappy: { damping: 28, stiffness: 320, mass: 0.75 },
} as const;

/** Screen fade-in on mount */
export const screenFade = {
  from: { opacity: 0, translateY: 6 },
  to: { opacity: 1, translateY: 0 },
  duration: motionDuration.standard,
} as const;
