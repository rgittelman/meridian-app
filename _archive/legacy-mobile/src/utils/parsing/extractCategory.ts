import type { ParsedField } from '@/types/capture';
import type { ItemCategory } from '@/services/priority/types';

type CategorySignals = Record<ItemCategory, string[]>;

const SIGNALS: CategorySignals = {
  family: [
    'pickup', 'pick up', 'drop off', 'dropoff', 'school', 'daycare', 'camp',
    'dentist for', 'appointment for', 'game', 'soccer', 'practice', 'recital',
    'kids', 'children', 'daughter', 'son', 'mom', 'dad', 'parent', 'baby',
    'bedtime', 'homework', 'teacher', 'birthday party',
  ],
  financial: [
    'pay ', 'payment', 'bill ', 'bills', 'invoice', 'deposit', 'fee', 'fees',
    'charge', 'refund', 'bank', 'credit', 'debit', 'subscription', 'renew',
    'insurance', 'mortgage', 'rent', 'tax', 'taxes', 'transfer', 'venmo',
    'zelle', 'overdue', 'due date', 'balance',
  ],
  household: [
    'dinner', 'dinners', 'groceries', 'grocery', 'food', 'meal', 'meals',
    'clean', 'cleaning', 'laundry', 'dishes', 'trash', 'recycling',
    'repair', 'fix', 'broken', 'plumber', 'contractor', 'lawn', 'garden',
    'supplies', 'amazon', 'order', 'delivery',
  ],
  work: [
    'meeting', 'call with', 'deck', 'presentation', 'proposal', 'report',
    'deadline', 'project', 'client', 'boss', 'team', 'standup', 'review',
    'quarterly', 'budget', 'strategy', 'follow up', 'follow-up', 'slack',
    'email to', 'send to',
  ],
  health: [
    'doctor', 'dentist', 'gym', 'workout', 'exercise', 'medicine',
    'prescription', 'refill', 'therapy', 'therapist', 'checkup', 'lab',
    'blood', 'physical', 'appointment', 'vitamin', 'sleep',
  ],
  personal: [
    'birthday', 'gift', 'present', 'friend', 'read', 'book', 'movie',
    'travel', 'trip', 'vacation', 'flight', 'hotel', 'hobby', 'music',
    'journal', 'meditate', 'meditation',
  ],
};

/**
 * Infer item category from signal words.
 * Returns the highest-scoring category with appropriate confidence.
 */
export function extractCategory(text: string): ParsedField<ItemCategory> | null {
  const lower = text.toLowerCase();
  const scores: Partial<Record<ItemCategory, { score: number; source: string }>> = {};

  for (const [cat, signals] of Object.entries(SIGNALS) as [ItemCategory, string[]][]) {
    let score = 0;
    let source = '';
    for (const signal of signals) {
      if (lower.includes(signal)) {
        score++;
        if (!source) source = signal;
      }
    }
    if (score > 0) {
      scores[cat] = { score, source };
    }
  }

  if (Object.keys(scores).length === 0) return null;

  // Pick highest score
  const [topCat, topData] = (
    Object.entries(scores) as [ItemCategory, { score: number; source: string }][]
  ).sort(([, a], [, b]) => b.score - a.score)[0];

  const confidence: ParsedField<ItemCategory>['confidence'] =
    topData.score >= 3 ? 'high' : topData.score === 2 ? 'medium' : 'low';

  return {
    value: topCat,
    confidence,
    source: topData.source,
  };
}
