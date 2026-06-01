/**
 * Meridian Resurfacing Engine — type layer.
 *
 * Resurfacing asks a different question from priority:
 * Priority:    "How important is this item?"
 * Resurfacing: "Is NOW the right moment to bring this back?"
 *
 * Both scores combine to produce what appears in the Focus screen.
 */

// ── Timing windows ────────────────────────────────────────────────────────────

/**
 * The contextual timing window for resurfacing a specific item.
 * Computed from the item's timing signals and the current clock.
 *
 * 'prep' = the optimal advance window (before the item becomes urgent)
 * 'low-pressure' = a calm moment appropriate for lower-stakes items
 */
export type ResurfacingTimingWindow =
  | 'overdue'      // Already missed or critically imminent
  | 'now'          // Within ~1 hour of timing signal
  | 'prep'         // Optimal preparation window (before urgency peaks)
  | 'today'        // Good window — today is the day
  | 'low-pressure' // Calm moment — not urgent but worth surfacing
  | 'later';       // Not the right time yet

// ── Cooldown tracking ─────────────────────────────────────────────────────────

export type CooldownEntry = {
  /** Epoch ms when item was last surfaced to the user */
  lastSurfacedAt: number;
  /**
   * How many times user has actively deferred this item.
   * Each deferral adds increasing cooldown duration.
   */
  deferCount: number;
};

// ── Resurfaced item shape ──────────────────────────────────────────────────────

/**
 * The output of the resurfacing pipeline.
 * Carries everything needed by the Focus screen — no raw LifeObject exposed.
 */
export type ResurfacedItem = {
  /** Original LifeObject id */
  id: string;
  /** Cleaned display title */
  title: string;
  /** Primary person involved, if detected at medium+ confidence */
  person?: string;
  /** Timing label for display (e.g. "Tomorrow 5 PM") */
  time?: string;
  /**
   * Timing window computed at engine runtime.
   * Determines whether NOW is a good moment to show this item.
   */
  timingWindow: ResurfacingTimingWindow;
  /** Combined score: priority × timing × cooldown. Higher = more likely to surface. */
  resurfacingScore: number;
  /**
   * Cluster label if this item belongs to a soft contextual group.
   * Used for adjacent ordering — no visible group headers.
   */
  group: string | null;
  /**
   * Soft reappearance hint — shown very subtly on the card.
   * Only present when the item has been dormant and NOW is a good prep window.
   * Examples: "You have breathing room for this." / "Small step now protects later."
   */
  reappearanceHint: string | null;
  /** Visual urgency treatment for FocusCard */
  visualUrgency: 'default' | 'time' | 'warm';
};

// ── Resurfacing engine output ─────────────────────────────────────────────────

export type ResurfacingResult = {
  /** Priority-ordered, timing-aware, cooldown-filtered items */
  items: ResurfacedItem[];
  /**
   * Optional single-sentence ambient insight.
   * Generated very rarely — only when there's something genuinely useful to say.
   * Never motivational. Never pressure. Just calm context.
   */
  insight: string | null;
};
