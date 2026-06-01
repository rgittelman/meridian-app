import type { LifeObjectRecurrence, ParsedField, RecurrenceCadence } from '@/types/capture';

const DAY_NAMES: { pattern: RegExp; index: number; label: string }[] = [
  { pattern: /\bsundays?\b/i, index: 0, label: 'Sunday' },
  { pattern: /\bmondays?\b/i, index: 1, label: 'Monday' },
  { pattern: /\btuesdays?\b/i, index: 2, label: 'Tuesday' },
  { pattern: /\bwednesdays?\b/i, index: 3, label: 'Wednesday' },
  { pattern: /\bthursdays?\b/i, index: 4, label: 'Thursday' },
  { pattern: /\bfridays?\b/i, index: 5, label: 'Friday' },
  { pattern: /\bsaturdays?\b/i, index: 6, label: 'Saturday' },
];

const WEEKLY_SIGNALS = [
  /\bweekly\b/i,
  /\bevery\s+week\b/i,
  /\beach\s+week\b/i,
  /\bonce\s+a\s+week\b/i,
  /\bper\s+week\b/i,
];

const DAILY_SIGNALS = [/\bdaily\b/i, /\bevery\s+day\b/i, /\beach\s+day\b/i];
const MONTHLY_SIGNALS = [/\bmonthly\b/i, /\bevery\s+month\b/i, /\beach\s+month\b/i];

/** Recurring weekday language only — not one-off "next Thursday". */
function detectRecurringDays(text: string): { indices: number[]; labels: string[] } {
  const indices: number[] = [];
  const labels: string[] = [];

  for (const day of DAY_NAMES) {
    const name = day.label.toLowerCase();
    const isOneOff =
      new RegExp(`\\bnext\\s+${name}\\b`, 'i').test(text) ||
      new RegExp(`\\bthis\\s+${name}\\b`, 'i').test(text);
    if (isOneOff) continue;

    const isRecurring =
      new RegExp(`every\\s+${name}\\b`, 'i').test(text) ||
      new RegExp(`on\\s+${name}s\\b`, 'i').test(text) ||
      new RegExp(`\\b${name}s\\b`, 'i').test(text);

    if (isRecurring) {
      indices.push(day.index);
      labels.push(day.label);
    }
  }

  return { indices: [...new Set(indices)], labels };
}

function cadenceFromText(text: string): RecurrenceCadence | null {
  if (DAILY_SIGNALS.some((r) => r.test(text))) return 'daily';
  if (MONTHLY_SIGNALS.some((r) => r.test(text))) return 'monthly';
  if (WEEKLY_SIGNALS.some((r) => r.test(text))) return 'weekly';
  if (/\bevery\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(text)) {
    return 'weekly';
  }
  if (detectRecurringDays(text).indices.length > 0) return 'weekly';
  return null;
}

function buildLabel(cadence: RecurrenceCadence, dayLabels: string[]): string {
  if (dayLabels.length === 1) {
    return cadence === 'weekly'
      ? `Weekly on ${dayLabels[0]}`
      : `${cadence.charAt(0).toUpperCase()}${cadence.slice(1)}`;
  }
  if (dayLabels.length > 1) {
    return `Weekly on ${dayLabels.join(', ')}`;
  }
  switch (cadence) {
    case 'daily':
      return 'Daily';
    case 'monthly':
      return 'Monthly';
    default:
      return 'Weekly';
  }
}

/**
 * Detects explicit recurring commitment language (weekly, every Monday, on Mondays, etc.).
 */
export function extractRecurrence(text: string): ParsedField<LifeObjectRecurrence> | null {
  const lower = text.toLowerCase();
  const cadence = cadenceFromText(lower);
  if (!cadence) return null;

  const { indices, labels } = detectRecurringDays(lower);
  const value: LifeObjectRecurrence = {
    cadence,
    daysOfWeek: indices,
    label: buildLabel(cadence, labels),
  };

  const hasExplicitDay = indices.length > 0;
  const hasWeeklyWord = WEEKLY_SIGNALS.some((r) => r.test(lower));
  const confidence =
    hasExplicitDay || (cadence === 'weekly' && hasWeeklyWord)
      ? 'high'
      : cadence === 'weekly' && /\brecurring\b/i.test(lower)
        ? 'medium'
        : 'medium';

  const sourceMatch =
    lower.match(
      /\b(?:weekly|daily|monthly|every\s+\w+|on\s+mondays?|on\s+tuesdays?|on\s+wednesdays?|on\s+thursdays?|on\s+fridays?|on\s+saturdays?|on\s+sundays?)\b[^.!?]*/i,
    )?.[0] ?? lower.slice(0, 48);

  return {
    value,
    confidence,
    source: sourceMatch.trim(),
  };
}
