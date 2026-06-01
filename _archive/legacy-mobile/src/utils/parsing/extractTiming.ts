import type { ParsedField, TimingHint } from '@/types/capture';

type TimingPattern = {
  regex: RegExp;
  confidence: ParsedField<TimingHint>['confidence'];
  label: (match: RegExpMatchArray) => string;
};

const PATTERNS: TimingPattern[] = [
  // Exact time + day (e.g., "tomorrow at 5:15", "Friday 3pm")
  {
    regex: /\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b.*?\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i,
    confidence: 'high',
    label: (m) => `${m[1].toLowerCase()} at ${m[2]}`,
  },

  // Standalone time (e.g., "at 5:15", "by 3pm")
  {
    regex: /\b(?:at|by|before|after)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i,
    confidence: 'high',
    label: (m) => m[0].trim(),
  },

  // Named relative days
  {
    regex: /\b(today|tonight|this morning|this afternoon|this evening)\b/i,
    confidence: 'high',
    label: (m) => m[1].toLowerCase(),
  },
  {
    regex: /\btomorrow\b/i,
    confidence: 'high',
    label: () => 'tomorrow',
  },

  // Day names (standalone)
  {
    regex: /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
    confidence: 'medium',
    label: (m) => m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase(),
  },

  // "This/next week/month"
  {
    regex: /\b(this|next)\s+(week|month|weekend)\b/i,
    confidence: 'medium',
    label: (m) => `${m[1]} ${m[2]}`.toLowerCase(),
  },

  // Relative "in X days/weeks"
  {
    regex: /\bin\s+(\d+|a|an|few)\s+(days?|weeks?|months?)\b/i,
    confidence: 'medium',
    label: (m) => `in ${m[1]} ${m[2]}`,
  },

  // "By end of week/month"
  {
    regex: /\bby\s+(?:end\s+of\s+)?(the\s+)?(week|month|day)\b/i,
    confidence: 'medium',
    label: (m) => `by end of ${m[2]}`,
  },

  // Standalone time (no day) — lower confidence
  {
    regex: /\b(\d{1,2}:\d{2})\b/,
    confidence: 'low',
    label: (m) => m[1],
  },
];

/**
 * Extract timing information from natural language text.
 * Returns the highest-confidence match only — parsers stay humble.
 */
export function extractTiming(text: string): ParsedField<TimingHint> | null {
  const lower = text.toLowerCase();

  for (const pattern of PATTERNS) {
    const match = lower.match(pattern.regex) ?? text.match(pattern.regex);
    if (match) {
      const label = pattern.label(match);
      return {
        value: { label },
        confidence: pattern.confidence,
        source: match[0],
      };
    }
  }

  return null;
}
