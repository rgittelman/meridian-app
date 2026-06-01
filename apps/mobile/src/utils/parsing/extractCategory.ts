import type { ParsedField } from '@/types/capture';
import type { ItemCategory } from '@/services/priority/types';
import { brandDomainBoosts } from './brandExclusions';

type CategorySignals = Record<ItemCategory, string[]>;

const SIGNALS: CategorySignals = {
  family: [
    'pickup', 'pick up', 'drop off', 'dropoff', 'school', 'daycare', 'camp',
    'dentist for', 'appointment for', 'game', 'soccer', 'practice', 'recital',
    'kids', 'children', 'daughter', 'son', 'mom', 'dad', 'parent', 'baby',
    'bedtime', 'homework', 'teacher', 'birthday party',
    'swim', 'swimming', 'sport', 'sports', 'league', 'season',
    'class', 'classes', 'lesson', 'lessons', 'registration', 'enroll',
    'pediatrician', 'playdate', 'carpool', 'permission slip', 'field trip',
    // child sports — specific sports not covered by generic 'sports'/'game'
    'football', 'volleyball', 'basketball', 'lacrosse', 'baseball',
    'tournament', 'tryout', 'tryouts',
  ],
  financial: [
    'pay ', 'payment', 'bill ', 'bills', 'invoice', 'deposit', 'fee', 'fees',
    'charge', 'refund', 'bank', 'credit', 'debit', 'subscription', 'renew',
    'insurance', 'mortgage', 'rent', 'tax', 'taxes', 'transfer', 'venmo',
    'zelle', 'overdue', 'due date', 'balance', 'registration fee',
    'tuition', 'premium', 'reimburse', 'reimbursement', 'expense',
  ],
  household: [
    'dinner', 'dinners', 'groceries', 'grocery', 'food', 'meal', 'meals',
    'clean', 'cleaning', 'laundry', 'dishes', 'trash', 'recycling',
    'repair', 'fix', 'broken', 'plumber', 'contractor', 'lawn', 'garden',
    'supplies', 'amazon', 'order', 'delivery', 'home depot', 'costco',
  ],
  work: [
    'meeting', 'call with', 'deck', 'presentation', 'proposal', 'report',
    'expense report', 'expense', 'submit', 'deadline', 'project', 'client',
    'boss', 'team', 'standup', 'review',
    'quarterly', 'budget', 'strategy', 'follow up', 'follow-up', 'slack',
    'email to', 'send to', 'board', 'board call', 'board meeting',
    'annual', 'staff', 'executive', 'director', 'leadership', 'rug sales',
    'sales', 'revenue', 'forecast', 'pipeline', 'invoice to',
    'summit', 'conference', 'symposium', 'forum', 'offsite', 'workshop',
    'seminar', 'keynote', 'site visit', 'store visit',
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

  for (const boost of brandDomainBoosts(lower)) {
    const existing = scores[boost.category];
    scores[boost.category] = {
      score: (existing?.score ?? 0) + boost.amount,
      source: boost.source,
    };
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
