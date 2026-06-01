import type { CaptureParseResult, ObjectType } from '@/types/capture';

/**
 * Infers the structural type of a capture from its parsed signals.
 *
 * Rules (applied in priority order):
 *
 * 1. High-confidence timing + people → event (interpersonal, scheduled)
 * 2. High-confidence timing only    → reminder (time-anchored)
 * 3. Scheduling intent              → task (explicit action required)
 * 4. Category match                 → task (categorized work to be done)
 * 5. Default                        → note (uncategorized thought)
 *
 * Never fake certainty. If ambiguous, default to 'task' (most actionable fallback).
 */
export function deriveObjectType(parse: CaptureParseResult): ObjectType {
  const hasTiming = parse.timing !== null;
  const highConfidenceTiming = parse.timing?.confidence === 'high';
  const hasPeople = parse.people.length > 0;
  const hasMeaningfulPeople = parse.people.some((p) => p.confidence !== 'low');

  // Scheduled interpersonal event
  if (highConfidenceTiming && hasMeaningfulPeople) {
    return 'event';
  }

  // Time-anchored reminder
  if (highConfidenceTiming) {
    return 'reminder';
  }

  // Explicit scheduling action
  if (parse.schedulingIntent) {
    return 'task';
  }

  // Categorized item — something to be done in a life domain
  if (parse.category && parse.category.confidence !== 'low') {
    return 'task';
  }

  // Has timing at lower confidence — likely a reminder
  if (hasTiming) {
    return 'reminder';
  }

  // Has people but no timing — often a task involving coordination
  if (hasMeaningfulPeople) {
    return 'task';
  }

  // Uncategorized thought — preserve as note, let system clarify later
  return 'note';
}
