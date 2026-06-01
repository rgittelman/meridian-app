import type {
  FocusItemData,
  OverloadState,
  PriorityComponents,
  PriorityScore,
  ScoredFocusItemData,
} from './types';
import {
  CONTEXT_BONUS,
  DUE_VALUE,
  EMOTIONAL_VALUE,
  ENERGY_VALUE,
  MOMENTUM_VALUE,
  PEOPLE_VALUE,
  URGENCY_VALUE,
  getWeights,
} from './weights';
import { deriveVisualUrgency } from './deriveVisualUrgency';

// ── Core scorer ───────────────────────────────────────────────────────────────

export function scoreItem(
  item: FocusItemData,
  overloadState: OverloadState = 'MEDIUM',
): ScoredFocusItemData {
  const intel = item.intelligence;
  const weights = getWeights(overloadState);

  // Factor values
  const urgencyVal = URGENCY_VALUE[intel.urgency];
  const emotionalVal = EMOTIONAL_VALUE[intel.emotionalWeight];
  const peopleVal = PEOPLE_VALUE[intel.peopleImpact];
  const dueVal = DUE_VALUE[intel.dueWindow];
  const energyVal = ENERGY_VALUE[intel.estimatedEnergy];
  const momentumVal = MOMENTUM_VALUE[intel.momentumValue ?? 'MEDIUM'];

  // Base components
  const urgencyScore = urgencyVal * weights.urgency;
  const emotionalScore = emotionalVal * weights.emotionalWeight;
  const peopleScore = peopleVal * weights.peopleImpact;
  const dueScore = dueVal * weights.dueProximity;
  const momentumScore = momentumVal * weights.momentumValue;
  const energyCost = energyVal * weights.energyCostMultiplier;

  // Context bonuses
  let contextBonus = 0;
  const reasons: string[] = [];

  // People-aware timing: high impact + imminent window
  const isPeopleHigh = peopleVal >= PEOPLE_VALUE.HIGH;
  const isDueToday = dueVal >= DUE_VALUE.TODAY;
  if (isPeopleHigh && isDueToday) {
    contextBonus += CONTEXT_BONUS.peopleAndTime;
    reasons.push('High people impact within timing window');
  }

  // Extra VERY_HIGH people bonus
  if (intel.peopleImpact === 'VERY_HIGH') {
    contextBonus += CONTEXT_BONUS.veryHighPeopleExtra;
    reasons.push('Very high relational consequence');
  }

  // Family commitment protection
  if (intel.isFamilyCommitment) {
    contextBonus += CONTEXT_BONUS.familyCommitment;
    reasons.push('Protected family commitment');
  }

  // Financial consequence
  if (intel.isFinancial) {
    contextBonus += CONTEXT_BONUS.financial;
    reasons.push('Prevents financial consequence');
  }

  // Future stress prevention
  if (intel.isStressPrevention) {
    contextBonus += CONTEXT_BONUS.stressPrevention;
    reasons.push('Prevents tomorrow stress');
  }

  const total =
    urgencyScore +
    emotionalScore +
    peopleScore +
    dueScore +
    momentumScore -
    energyCost +
    contextBonus;

  const components: PriorityComponents = {
    urgency: urgencyScore,
    emotionalWeight: emotionalScore,
    peopleImpact: peopleScore,
    dueProximity: dueScore,
    momentumValue: momentumScore,
    energyCost: -energyCost,
    contextBonus,
  };

  // Dominant factor: highest positive component
  const dominantFactor = pickDominant(components);

  // If no reasons yet, build a default one from dominant factor
  if (reasons.length === 0) {
    reasons.push(defaultReason(dominantFactor, intel));
  }

  const priorityScore: PriorityScore = {
    total,
    components,
    reasons,
    dominantFactor,
  };

  return {
    ...item,
    priorityScore,
    visualUrgency: deriveVisualUrgency(item),
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pickDominant(components: PriorityComponents): string {
  const entries = Object.entries(components) as [keyof PriorityComponents, number][];
  // Exclude energyCost (negative); it's a suppressor, not a driver
  const drivers = entries.filter(([key, val]) => key !== 'energyCost' && val > 0);
  if (drivers.length === 0) return 'urgency';
  const [key] = drivers.reduce((a, b) => (a[1] >= b[1] ? a : b));
  return key;
}

function defaultReason(
  factor: string,
  intel: FocusItemData['intelligence'],
): string {
  switch (factor) {
    case 'peopleImpact':
      return `Relational impact: ${intel.peopleImpact.toLowerCase()}`;
    case 'dueProximity':
      return `Due ${intel.dueWindow.toLowerCase().replace('_', ' ')}`;
    case 'urgency':
      return `${intel.urgency.toLowerCase()} urgency`;
    case 'emotionalWeight':
      return `${intel.emotionalWeight.toLowerCase()} emotional weight`;
    case 'contextBonus':
      return 'Context-adjusted priority';
    default:
      return 'Standard priority';
  }
}
