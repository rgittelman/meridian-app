import type { ParsedField } from '@/types/capture';
import type { EmotionalWeight, UrgencyLevel } from '@/services/priority/types';

// ── Urgency signals ───────────────────────────────────────────────────────────

const URGENCY_HIGH_SIGNALS = [
  'asap', 'urgent', 'urgently', 'immediately', 'right now', 'right away',
  'must', 'critical', 'emergency', 'today', 'tonight', 'in an hour',
  '!!', '!',
];

const URGENCY_MEDIUM_SIGNALS = [
  'soon', 'this week', 'need to', 'need', 'have to', 'should', 'by friday',
  'by monday', 'due', 'deadline',
];

const URGENCY_LOW_SIGNALS = [
  'eventually', 'someday', 'when i get a chance', 'no rush', 'low priority',
  'maybe', 'could', 'might', 'one day',
];

// ── Emotional weight signals ──────────────────────────────────────────────────

const EMOTIONAL_HIGH_SIGNALS = [
  'stressed', 'anxious', 'worried', 'hate', 'dreading', 'overwhelmed',
  'scared', 'nervous', 'important', 'critical', "can't forget", 'must not forget',
];

const EMOTIONAL_MEDIUM_SIGNALS = [
  'need to', 'have to', 'should', 'really', 'keep forgetting', 'always forget',
  'want to', 'hoping', 'trying to',
];

function findFirst(text: string, signals: string[]): string | null {
  const lower = text.toLowerCase();
  for (const s of signals) {
    if (lower.includes(s)) return s;
  }
  return null;
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
  const highSource = findFirst(text, EMOTIONAL_HIGH_SIGNALS);
  if (highSource) {
    return { value: 'HIGH', confidence: 'medium', source: highSource };
  }

  const medSource = findFirst(text, EMOTIONAL_MEDIUM_SIGNALS);
  if (medSource) {
    return { value: 'MEDIUM', confidence: 'low', source: medSource };
  }

  return null;
}
