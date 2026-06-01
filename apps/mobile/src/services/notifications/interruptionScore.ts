import type { Confidence } from '@/types/capture';
import type { HouseholdImpactLevel } from '@/types/relevance';
import type {
  InterruptionScore,
  NotificationCandidate,
  NotificationTimingSensitivity,
} from '@/types/notification';
import type { PeopleImpact } from '@/services/priority/types';

function confidencePoints(c: Confidence): number {
  switch (c) {
    case 'high':
      return 18;
    case 'medium':
      return 12;
    default:
      return 4;
  }
}

function householdImpactPoints(level: HouseholdImpactLevel): number {
  switch (level) {
    case 'high':
      return 28;
    case 'medium':
      return 18;
    case 'low':
      return 8;
    default:
      return 0;
  }
}

function timingSensitivityPoints(level: NotificationTimingSensitivity): number {
  switch (level) {
    case 'high':
      return 22;
    case 'medium':
      return 14;
    default:
      return 6;
  }
}

function peopleImpactPoints(impact: PeopleImpact): number {
  switch (impact) {
    case 'VERY_HIGH':
      return 20;
    case 'HIGH':
      return 16;
    case 'MEDIUM':
      return 10;
    case 'LOW':
      return 4;
    default:
      return 0;
  }
}

/**
 * Internal interruption score — assists suppression and ranking only.
 * Not urgency, not user-facing.
 */
export function computeInterruptionScore(
  candidate: NotificationCandidate,
  peopleImpact: PeopleImpact = 'NONE',
): InterruptionScore {
  const householdImpact = householdImpactPoints(candidate.householdImpact);
  const timingSensitivity = timingSensitivityPoints(candidate.timingSensitivity);
  const conflictRisk = Math.min(30, candidate.conflictRisk * 10);
  const prepRelevance = Math.min(15, candidate.prepRelevance * 5);
  const people = peopleImpactPoints(peopleImpact);
  const confidence = confidencePoints(candidate.confidence);

  const typeBoost =
    candidate.type === 'critical_commitment_protection'
      ? 12
      : candidate.type === 'morning_brief'
        ? 4
        : 0;

  const total = Math.min(
    100,
    Math.round(
      householdImpact +
        timingSensitivity +
        conflictRisk +
        prepRelevance +
        people +
        confidence +
        typeBoost,
    ),
  );

  return {
    total,
    householdImpact,
    timingSensitivity,
    conflictRisk,
    prepRelevance,
    peopleImpact: people,
    confidence,
  };
}

export function compareByInterruptionScore(
  a: { interruptionScore: InterruptionScore },
  b: { interruptionScore: InterruptionScore },
): number {
  return b.interruptionScore.total - a.interruptionScore.total;
}
