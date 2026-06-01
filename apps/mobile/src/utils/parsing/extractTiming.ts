import type { ParsedField, TimingHint } from '@/types/capture';

type TimingPattern = {
  regex: RegExp;
  confidence: ParsedField<TimingHint>['confidence'];
  label: (match: RegExpMatchArray) => string;
};

const PATTERNS: TimingPattern[] = [
  // "next Thursday at 10am" — explicit relative weekday + clock
  {
    regex:
      /\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b[^.?!]{0,64}?\b(?:at|by)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i,
    confidence: 'high',
    label: (m) => `next ${m[1].toLowerCase()} at ${m[2]}`,
  },

  // "next Thursday" (day only — paired with separate "at 10am" in same string)
  {
    regex: /\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
    confidence: 'high',
    label: (m) => `next ${m[1].toLowerCase()}`,
  },

  // Day + approximate time — "tomorrow around 1pm"
  {
    regex:
      /\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b[^.?!]{0,64}?\b(?:around|about)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i,
    confidence: 'high',
    label: (m) => `${m[1].toLowerCase()} around ${m[2]}`,
  },

  // Weekday night (e.g. "Thursday night")
  {
    regex:
      /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+night\b/i,
    confidence: 'high',
    label: (m) => `${m[1].toLowerCase()} night`,
  },

  // Day at noon
  {
    regex:
      /\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b[^.?!]{0,80}?\b(?:at\s+)?noon\b/i,
    confidence: 'high',
    label: (m) => `${m[1].toLowerCase()} at noon`,
  },

  // Exact time + day (e.g., "tomorrow at 5:15", "Friday 3pm", "Thursday in NYC at 10am")
  {
    regex:
      /\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b[^.?!]{0,80}?\b(?:at|by)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i,
    confidence: 'high',
    label: (m) => `${m[1].toLowerCase()} at ${m[2]}`,
  },

  // Day + clock without meridiem — "Tuesday at 6", "Wednesday at 11"
  {
    regex:
      /\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b[^.?!]{0,80}?\b(?:at|by)\s+(\d{1,2})(?::(\d{2}))?(?!\s*(?:am|pm)\b)/i,
    confidence: 'high',
    label: (m) =>
      m[3] ? `${m[1].toLowerCase()} at ${m[2]}:${m[3]}` : `${m[1].toLowerCase()} at ${m[2]}`,
  },

  // Standalone time with meridiem (e.g., "at 5:15pm", "by 3pm")
  {
    regex: /\b(?:at|by|before|after)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i,
    confidence: 'high',
    label: (m) => m[0].trim(),
  },

  // Standalone clock without meridiem — "at 5:15", "at 6" (not followed by am/pm)
  {
    regex: /\b(?:at|by)\s+(\d{1,2})(?::(\d{2}))?(?!\s*(?:am|pm)\b)/i,
    confidence: 'high',
    label: (m) => (m[2] ? `at ${m[1]}:${m[2]}` : `at ${m[1]}`),
  },

  // Day + time-of-day window (e.g. "tomorrow morning")
  {
    regex: /\b(today|tomorrow)\s+(morning|afternoon|evening)\b/i,
    confidence: 'high',
    label: (m) => `${m[1].toLowerCase()} ${m[2].toLowerCase()}`,
  },

  // Day directly followed by clock+meridiem, no "at/by" connector
  // e.g. "Saturday 9am", "tomorrow 8pm", "Friday 5:15pm"
  // Must run before standalone-day patterns so the clock is not swallowed first.
  {
    regex:
      /\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i,
    confidence: 'high',
    label: (m) => `${m[1].toLowerCase()} at ${m[2].trim()}`,
  },

  // "before Friday" / "before Monday" — deadline day, clock not required
  {
    regex:
      /\bbefore\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow)\b/i,
    confidence: 'high',
    label: (m) => `before ${m[1].toLowerCase()}`,
  },

  // "by Friday" / "by Monday" — deadline day (distinct from "by 5pm" which uses a digit)
  {
    regex:
      /\bby\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow)(?!\s*\d)\b/i,
    confidence: 'high',
    label: (m) => `by ${m[1].toLowerCase()}`,
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
