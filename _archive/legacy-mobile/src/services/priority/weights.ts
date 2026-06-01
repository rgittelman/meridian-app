import type {
  DueWindow,
  EmotionalWeight,
  EnergyLevel,
  MomentumValue,
  OverloadState,
  PeopleImpact,
  UrgencyLevel,
} from './types';

// ── Ordinal numeric values ────────────────────────────────────────────────────

export const URGENCY_VALUE: Record<UrgencyLevel, number> = {
  LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4,
};

export const EMOTIONAL_VALUE: Record<EmotionalWeight, number> = {
  LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4,
};

export const PEOPLE_VALUE: Record<PeopleImpact, number> = {
  NONE: 0, LOW: 1, MEDIUM: 2, HIGH: 3, VERY_HIGH: 4,
};

export const DUE_VALUE: Record<DueWindow, number> = {
  LATER: 0, THIS_WEEK: 1, TOMORROW: 2, TODAY: 3, NOW: 4, OVERDUE: 5,
};

export const ENERGY_VALUE: Record<EnergyLevel, number> = {
  LOW: 1, MEDIUM: 2, HIGH: 3,
};

export const MOMENTUM_VALUE: Record<MomentumValue, number> = {
  LOW: 1, MEDIUM: 2, HIGH: 3,
};

// ── Base factor weights (normal / LOW overload state) ─────────────────────────
//
// peopleImpact weight is intentionally above urgency.
// The engine should value relational consequences over deadline pressure.

export const BASE_WEIGHTS = {
  urgency: 18,
  emotionalWeight: 15,
  peopleImpact: 22,
  dueProximity: 20,
  momentumValue: 8,
  energyCostMultiplier: 7,    // subtracted from total; higher energy = higher cost
} as const;

// ── Overload adjustments applied when state is HIGH ───────────────────────────
//
// HIGH overload: protect relational items, penalize high-energy work,
// surface recovery and emotional-relief opportunities.

export const OVERLOAD_HIGH_DELTA = {
  urgency: -4,
  emotionalWeight: +5,
  peopleImpact: +10,
  dueProximity: +2,
  energyCostMultiplier: +7,   // energy penalty doubles
} as const;

// Partial adjustments for MEDIUM overload
export const OVERLOAD_MEDIUM_DELTA = {
  urgency: -2,
  emotionalWeight: +2,
  peopleImpact: +5,
  dueProximity: +1,
  energyCostMultiplier: +3,
} as const;

// ── Context bonus values ──────────────────────────────────────────────────────

export const CONTEXT_BONUS = {
  /**
   * People-aware timing: high people impact + imminent timing.
   * This is the primary people-aware signal.
   */
  peopleAndTime: 20,

  /** Extra bonus when impact is VERY_HIGH (family, dependent, partner) */
  veryHighPeopleExtra: 12,

  /** Explicit family commitment flag — protects pickup, care, appointments */
  familyCommitment: 15,

  /** Financial consequence if delayed */
  financial: 10,

  /** Completing today measurably prevents future stress */
  stressPrevention: 8,
} as const;

// ── Derived weight helpers ────────────────────────────────────────────────────

export function getWeights(overload: OverloadState) {
  const delta =
    overload === 'HIGH'
      ? OVERLOAD_HIGH_DELTA
      : overload === 'MEDIUM'
        ? OVERLOAD_MEDIUM_DELTA
        : { urgency: 0, emotionalWeight: 0, peopleImpact: 0, dueProximity: 0, energyCostMultiplier: 0 };

  return {
    urgency: BASE_WEIGHTS.urgency + delta.urgency,
    emotionalWeight: BASE_WEIGHTS.emotionalWeight + delta.emotionalWeight,
    peopleImpact: BASE_WEIGHTS.peopleImpact + delta.peopleImpact,
    dueProximity: BASE_WEIGHTS.dueProximity + delta.dueProximity,
    momentumValue: BASE_WEIGHTS.momentumValue,
    energyCostMultiplier: BASE_WEIGHTS.energyCostMultiplier + delta.energyCostMultiplier,
  };
}
