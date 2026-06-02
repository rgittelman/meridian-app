/**
 * Capture reminder generator — Phase J.1.
 *
 * Produces `capture_reminder` candidates for active captures that contain
 * explicit reminder intent ("remind me to", "alert me to", etc.) and a
 * resolvable future time.
 *
 * Design:
 * - Explicit-intent-only: implicit timed captures ("call Matt at 3pm") are
 *   not detected in V1.
 * - One candidate per capture — keyed by capture ID.
 * - Lifecycle: when a capture is marked done/archived, the generator stops
 *   producing its candidate, reconciliation detects the missing bundle, and
 *   cancel_stale fires automatically.
 * - Does not modify any locked intelligence system.
 */

import type { LifeObject } from '@/types/capture';
import type { NotificationCandidate } from '@/types/notification';
import { buildCandidate, dayKey } from './candidateHelpers';
import { detectReminderIntent, resolveReminderTime } from './detectReminderIntent';

/** Width of the OS scheduling window around the reminder fire time. */
const REMINDER_WINDOW_WIDTH_MS = 5 * 60 * 1000; // 5 minutes

export function generateCaptureReminderCandidates(
  captures: LifeObject[],
  now = new Date(),
): NotificationCandidate[] {
  const candidates: NotificationCandidate[] = [];

  for (const capture of captures) {
    // Only active captures — done/archived are silently ignored.
    if (capture.status === 'done' || capture.status === 'archived') continue;

    const intent = detectReminderIntent(capture.raw ?? '');
    if (!intent.hasIntent) continue;

    const reminderTime = resolveReminderTime(capture, now, intent);
    if (!reminderTime) continue;

    const windowStart = reminderTime;
    const windowEnd = new Date(reminderTime.getTime() + REMINDER_WINDOW_WIDTH_MS);

    candidates.push(
      buildCandidate({
        id: `capture-reminder-${capture.id}-${dayKey(now)}`,
        type: 'capture_reminder',
        event: null,
        captureIds: [capture.id],
        generatedAt: now,
        windowStart,
        windowEnd,
        confidence: 'high',
        interruptionReason: 'User requested this reminder.',
        bundleKey: `capture-reminder-${capture.id}`,
        primaryLine: intent.taskText,
        secondaryLine: null,
        additionalLines: [],
        timingSensitivity: 'high',
        householdImpact: 'medium',
        conflictRisk: 0,
        prepRelevance: 0,
      }),
    );
  }

  return candidates;
}
