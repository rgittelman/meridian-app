import type { ParsedField } from '@/types/capture';
import type { EmotionalWeight, UrgencyLevel } from '@/services/priority/types';

// ── Urgency signals ───────────────────────────────────────────────────────────

const URGENCY_HIGH_SIGNALS = [
  'asap', 'urgent', 'urgently', 'immediately', 'right now', 'right away',
  'must', 'critical', 'emergency', 'today', 'tonight', 'in an hour',
  '!!', '!',
];

const URGENCY_MEDIUM_SIGNALS = [
  'soon', 'this week', 'need to', 'need', 'have to', 'should',
  'by friday', 'by monday', 'by tuesday', 'by wednesday',
  'by thursday', 'by saturday', 'by sunday', 'by tomorrow',
  'before friday', 'before monday', 'before tuesday', 'before wednesday',
  'before thursday', 'before saturday', 'before sunday', 'before tomorrow',
  'due', 'deadline', 'before the', 'before my',
];

const URGENCY_LOW_SIGNALS = [
  'eventually', 'someday', 'when i get a chance', 'no rush', 'low priority',
  'maybe', 'could', 'might', 'one day',
];

// ── Emotional weight signals ──────────────────────────────────────────────────

const EMOTIONAL_HIGH_SIGNALS = [
  'stressed', 'anxious', 'worried', 'hate', 'dreading', 'overwhelmed',
  'scared', 'nervous', 'important', 'critical', "can't forget", 'must not forget',
  // Family timing signals — child logistics carry high emotional weight
  'pickup', 'pick up', 'drop off', 'dropoff', 'school pickup', 'school drop',
];

const EMOTIONAL_MEDIUM_SIGNALS = [
  'need to', 'have to', 'should', 'really', 'keep forgetting', 'always forget',
  'want to', 'hoping', 'trying to', 'remember to', 'remind me',
];

// Words that amplify emotional weight when combined with family context
const FAMILY_TIMING_AMPLIFIERS = [
  'tomorrow', 'tonight', 'today', 'in an hour', 'this afternoon', 'this evening',
  'at 5', 'at 4', 'at 3', 'pickup', 'pick up',
];

const FAMILY_CONTEXT_WORDS = [
  'kids', 'children', 'daughter', 'son', 'baby', 'mom', 'dad',
  'swim', 'practice', 'game', 'school', 'daycare', 'camp',
];

function findFirst(text: string, signals: string[]): string | null {
  const lower = text.toLowerCase();
  for (const s of signals) {
    if (lower.includes(s)) return s;
  }
  return null;
}

function hasAny(text: string, signals: string[]): boolean {
  const lower = text.toLowerCase();
  return signals.some((s) => lower.includes(s));
}

export function extractUrgency(text: string): ParsedField<UrgencyLevel> | null {
  const highSource = findFirst(text, URGENCY_HIGH_SIGNALS);
  if (highSource) {
    return { value: 'HIGH', confidence: highSource === '!' ? 'low' : 'medium', source: highSource };
  }

  const medSource = findFirst(text, URGENCY_MEDIUM_SIGNALS);
  if (medSource) {
    return { value: 'MEDIUM', confidence: 'low', source: medSource };
  }

  const lowSource = findFirst(text, URGENCY_LOW_SIGNALS);
  if (lowSource) {
    return { value: 'LOW', confidence: 'medium', source: lowSource };
  }

  return null;
}

export function extractEmotionalWeight(text: string): ParsedField<EmotionalWeight> | null {
  // High: explicit emotional language
  const highSource = findFirst(text, EMOTIONAL_HIGH_SIGNALS);
  if (highSource) {
    return { value: 'HIGH', confidence: 'medium', source: highSource };
  }

  // High: family logistics + near-term timing = elevated emotional load
  const hasFamilyContext = hasAny(text, FAMILY_CONTEXT_WORDS);
  const hasNearTiming = hasAny(text, FAMILY_TIMING_AMPLIFIERS);
  if (hasFamilyContext && hasNearTiming) {
    return { value: 'HIGH', confidence: 'medium', source: 'family+timing' };
  }

  // High: family context alone (child-related items carry inherent emotional weight)
  if (hasFamilyContext) {
    return { value: 'HIGH', confidence: 'low', source: 'family context' };
  }

  // Medium: general "need to" language
  const medSource = findFirst(text, EMOTIONAL_MEDIUM_SIGNALS);
  if (medSource) {
    return { value: 'MEDIUM', confidence: 'low', source: medSource };
  }

  return null;
}
