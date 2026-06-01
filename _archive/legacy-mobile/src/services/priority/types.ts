/**
 * Meridian Priority Intelligence — type layer.
 *
 * Priority is not "highest urgency wins."
 * Priority is "what best reduces future stress, emotional load, and real-world consequences."
 */

// ── Ordinal scales ────────────────────────────────────────────────────────────

export type UrgencyLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type EmotionalWeight = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type PeopleImpact = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

/**
 * DueWindow describes real-time proximity to a deadline.
 * OVERDUE = already missed or imminent.
 * NOW     = within ~1 hour.
 * TODAY   = within the rest of today.
 * etc.
 */
export type DueWindow =
  | 'OVERDUE'
  | 'NOW'
  | 'TODAY'
  | 'TOMORROW'
  | 'THIS_WEEK'
  | 'LATER';

export type EnergyLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type MomentumValue = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * OverloadState: user's current cognitive + emotional load.
 * Affects how aggressively the engine penalizes high-energy items
 * and boosts relational / recovery-oriented items.
 */
export type OverloadState = 'LOW' | 'MEDIUM' | 'HIGH';

export type ItemCategory =
  | 'work'
  | 'family'
  | 'financial'
  | 'health'
  | 'personal'
  | 'household';

// ── Intelligence metadata attached to every scoreable item ───────────────────

export type FocusItemIntelligence = {
  urgency: UrgencyLevel;
  emotionalWeight: EmotionalWeight;
  peopleImpact: PeopleImpact;
  dueWindow: DueWindow;
  estimatedEnergy: EnergyLevel;
  momentumValue?: MomentumValue;
  category?: ItemCategory;
  /** Item directly involves a family member — gets commitment protection */
  isFamilyCommitment?: boolean;
  /** Item has financial consequences if delayed */
  isFinancial?: boolean;
  /** Completing this today prevents measurable future stress */
  isStressPrevention?: boolean;
};

// ── Input domain type ─────────────────────────────────────────────────────────

export type FocusItemData = {
  id: string;
  title: string;
  /** Display name of the associated person */
  person?: string;
  /** Short display time string, e.g. "5:15 PM" */
  time?: string;
  completed?: boolean;
  intelligence: FocusItemIntelligence;
};

// ── Scoring output ────────────────────────────────────────────────────────────

export type PriorityComponents = {
  urgency: number;
  emotionalWeight: number;
  peopleImpact: number;
  dueProximity: number;
  momentumValue: number;
  energyCost: number;
  contextBonus: number;
};

export type PriorityScore = {
  total: number;
  components: PriorityComponents;
  /**
   * Human-readable reasons ordered by contribution.
   * Architecture supports future explainability surface.
   */
  reasons: string[];
  dominantFactor: string;
};

export type ScoredFocusItemData = FocusItemData & {
  priorityScore: PriorityScore;
  /**
   * Derived visual treatment for FocusCard.
   * Computed from intelligence — not manually specified.
   */
  visualUrgency: 'default' | 'time' | 'warm';
};
