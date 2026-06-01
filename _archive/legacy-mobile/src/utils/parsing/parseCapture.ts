import type { CaptureParseResult } from '@/types/capture';
import { extractCategory } from './extractCategory';
import { extractPeople } from './extractPeople';
import { extractTiming } from './extractTiming';
import { extractEmotionalWeight, extractUrgency } from './extractUrgency';

const ROUTINE_SIGNALS = [
  'every week', 'every day', 'every month', 'weekly', 'daily', 'monthly',
  'each week', 'each day', 'recurring', 'reminder to', 'always need',
];

const SCHEDULING_SIGNALS = [
  'schedule', 'book', 'set up', 'arrange', 'plan', 'confirm',
  'reschedule', 'cancel', 'move', 'change time',
];

function hasSignal(text: string, signals: string[]): boolean {
  const lower = text.toLowerCase();
  return signals.some((s) => lower.includes(s));
}

/**
 * Orchestrates all local parsers into a single CaptureParseResult.
 *
 * Design principles:
 * - Pure function — no side effects, no network
 * - Humble — low confidence defaults, never overwrites high confidence
 * - Fast — must not block the UI thread (all sync, lightweight regex)
 * - Stub-friendly — AI enrichment can overlay results post-parse
 */
export function parseCapture(raw: string): CaptureParseResult {
  const text = raw.trim();

  return {
    raw: text,
    people: extractPeople(text),
    timing: extractTiming(text),
    category: extractCategory(text),
    urgency: extractUrgency(text),
    emotionalWeight: extractEmotionalWeight(text),
    schedulingIntent: hasSignal(text, SCHEDULING_SIGNALS),
    isRoutine: hasSignal(text, ROUTINE_SIGNALS),
  };
}
