import type { FocusItemData } from './types';

/**
 * Canonical demo scenario — people-aware prioritization.
 *
 * Expected ordering after sortByPriority():
 *   1. Grace pickup at 5:15
 *      → VERY_HIGH people impact + NOW timing + family commitment
 *   2. Review payment due tomorrow
 *      → Financial consequence + stress prevention
 *   3. Finish Q3 budget deck
 *      → HIGH urgency but LOW people + HIGH energy cost
 *
 * The engine intentionally overrides naive urgency-first ordering.
 * Q3 deck is "most urgent" by deadline pressure alone — but would create
 * an emotional collision and miss a protected family commitment.
 */
export const MOCK_FOCUS_SCENARIO: FocusItemData[] = [
  {
    id: 'mock-budget-deck',
    title: 'Finish Q3 budget deck',
    intelligence: {
      urgency: 'HIGH',
      emotionalWeight: 'MEDIUM',
      peopleImpact: 'LOW',
      dueWindow: 'TOMORROW',
      estimatedEnergy: 'HIGH',
      momentumValue: 'MEDIUM',
      category: 'work',
      isStressPrevention: false,
    },
  },
  {
    id: 'mock-grace-pickup',
    title: 'Grace pickup at 5:15',
    person: 'Grace',
    time: '5:15 PM',
    intelligence: {
      urgency: 'MEDIUM',
      emotionalWeight: 'HIGH',
      peopleImpact: 'VERY_HIGH',
      dueWindow: 'NOW',
      estimatedEnergy: 'LOW',
      momentumValue: 'HIGH',
      category: 'family',
      isFamilyCommitment: true,
    },
  },
  {
    id: 'mock-payment',
    title: 'Review payment due tomorrow',
    intelligence: {
      urgency: 'MEDIUM',
      emotionalWeight: 'MEDIUM',
      peopleImpact: 'MEDIUM',
      dueWindow: 'TOMORROW',
      estimatedEnergy: 'MEDIUM',
      momentumValue: 'MEDIUM',
      category: 'financial',
      isFinancial: true,
      isStressPrevention: true,
    },
  },
];

/**
 * Additional scenarios for future use — demonstrate overload suppression,
 * recovery preservation, etc.
 */
export const MOCK_OVERLOAD_SCENARIO: FocusItemData[] = [
  {
    id: 'overload-deep-work',
    title: 'Complete architecture proposal',
    intelligence: {
      urgency: 'HIGH',
      emotionalWeight: 'MEDIUM',
      peopleImpact: 'LOW',
      dueWindow: 'TODAY',
      estimatedEnergy: 'HIGH',
      momentumValue: 'LOW',
      category: 'work',
    },
  },
  {
    id: 'overload-quick-win',
    title: 'Reply to Sarah about dinner',
    person: 'Sarah',
    intelligence: {
      urgency: 'MEDIUM',
      emotionalWeight: 'HIGH',
      peopleImpact: 'HIGH',
      dueWindow: 'TODAY',
      estimatedEnergy: 'LOW',
      momentumValue: 'HIGH',
      category: 'personal',
      isFamilyCommitment: true,
    },
  },
  {
    id: 'overload-medium',
    title: 'Review health insurance renewal',
    intelligence: {
      urgency: 'MEDIUM',
      emotionalWeight: 'HIGH',
      peopleImpact: 'MEDIUM',
      dueWindow: 'THIS_WEEK',
      estimatedEnergy: 'MEDIUM',
      momentumValue: 'HIGH',
      category: 'health',
      isStressPrevention: true,
    },
  },
];
