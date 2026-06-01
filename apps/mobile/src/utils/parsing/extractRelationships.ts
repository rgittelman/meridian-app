import type { Confidence, RelatedContext } from '@/types/capture';

type RelationshipPattern = {
  regex: RegExp;
  label: string;
  confidence: Confidence;
};

/**
 * Prep-chain patterns — detects when a capture is preparatory to a known context.
 * "Review budget before board call" → "board prep"
 * "Notes for the presentation" → "meeting prep"
 */
const PREP_CHAIN_PATTERNS: RelationshipPattern[] = [
  {
    regex: /\b(?:before|ahead of|prior to|for)\s+(?:the\s+)?board\s+(?:call|meeting|review|presentation|session)/i,
    label: 'board prep',
    confidence: 'high',
  },
  {
    regex: /\bboard\s+(?:call|meeting|review|presentation)\b/i,
    label: 'board meeting',
    confidence: 'high',
  },
  {
    regex: /\b(?:before|ahead of|for)\s+(?:the\s+)?(?:meeting|standup|all-hands|town hall)\b/i,
    label: 'meeting prep',
    confidence: 'medium',
  },
  {
    regex: /\b(?:before|for)\s+(?:the\s+)?(?:interview|review session|performance review)\b/i,
    label: 'interview prep',
    confidence: 'medium',
  },
  {
    regex: /\b(?:notes?|prep|prepare|review)\s+(?:for|before)\s+(?:the\s+)?(?:call|meeting|presentation)/i,
    label: 'meeting prep',
    confidence: 'medium',
  },
];

/**
 * Recurring cluster patterns — seasonal or repeating life logistics.
 * "Pay swim registration" → "swim season"
 */
const CLUSTER_PATTERNS: RelationshipPattern[] = [
  {
    regex: /\bswim(?:ming)?\s+(?:registration|class|practice|lesson|team|season|meet)\b/i,
    label: 'swim season',
    confidence: 'medium',
  },
  {
    regex: /\bcamp\s+(?:registration|deposit|fee|form|packing|pickup)\b/i,
    label: 'camp logistics',
    confidence: 'medium',
  },
  {
    regex: /\bschool\s+(?:registration|forms?|pickup|dropoff|supplies|shopping|year)\b/i,
    label: 'school logistics',
    confidence: 'medium',
  },
  {
    regex: /\bsoccer\s+(?:season|registration|practice|game|tryout|fee)\b/i,
    label: 'soccer season',
    confidence: 'medium',
  },
  {
    regex: /\b(?:registration|sign\s*up|enroll|enrollment)\s+(?:for|to)\b/i,
    label: 'enrollment task',
    confidence: 'low',
  },
  {
    regex: /\b(?:birthday\s+party|birthday\s+gift|birthday\s+dinner)\b/i,
    label: 'birthday event',
    confidence: 'high',
  },
  {
    regex: /\b(?:annual|yearly|every\s+year)\s+/i,
    label: 'annual recurring',
    confidence: 'low',
  },
];

/**
 * Extract related contextual clusters from capture text.
 * These are invisible to the user — they power quiet intelligence.
 */
export function extractRelatedContexts(text: string): RelatedContext[] {
  const found: RelatedContext[] = [];
  const seen = new Set<string>();

  for (const { regex, label, confidence } of [...PREP_CHAIN_PATTERNS, ...CLUSTER_PATTERNS]) {
    if (!seen.has(label) && regex.test(text)) {
      found.push({ label, confidence });
      seen.add(label);
    }
  }

  return found;
}
