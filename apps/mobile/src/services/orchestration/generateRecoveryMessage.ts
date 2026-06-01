/**
 * Meridian Orchestration — Recovery Messaging
 *
 * Generates a single soft, grounding message for high-overload states.
 * Very rarely fires — the default is silence.
 *
 * Message tone:
 * - Human, not therapeutic
 * - Grounding, not motivational
 * - Calm, not cheerful
 * - Factual about the situation, not prescriptive
 *
 * These are NOT coach messages. They read like something a thoughtful
 * friend might quietly say — and most of the time they say nothing.
 */

import type { OverloadState } from '@/services/priority/types';
import type { OverloadFactors } from './detectOverload';

type RecoveryContext = {
  overloadState: OverloadState;
  factors: OverloadFactors;
  currentHour: number;
  lastMessage: string | null;
};

const RECOVERY_MESSAGES: Record<string, string[]> = {
  evening_heavy: [
    "You don't need to solve everything tonight.",
    'A few small things matter more than catching up.',
    'This evening may be lighter than it feels.',
  ],
  timing_collision: [
    'One at a time — the rest can wait a moment.',
    "The most time-sensitive thing is already at the top.",
  ],
  late_night: [
    'You can rest soon.',
    'The rest can wait until tomorrow.',
  ],
  general_high: [
    "You're handling more than it looks like from the outside.",
    'What matters most is already visible.',
  ],
  family_heavy: [
    'The family things are in the right order.',
  ],
};

function pick(key: string, exclude: string | null): string | null {
  const options = RECOVERY_MESSAGES[key];
  if (!options) return null;
  const filtered = exclude ? options.filter((o) => o !== exclude) : options;
  if (filtered.length === 0) return null;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

/**
 * Returns a single recovery message, or null.
 * Only fires during HIGH overload and at specific time windows.
 */
export function generateRecoveryMessage(ctx: RecoveryContext): string | null {
  const { overloadState, factors, currentHour, lastMessage } = ctx;

  // Only fire during HIGH overload
  if (overloadState !== 'HIGH') return null;

  const isEvening = currentHour >= 17 && currentHour <= 22;
  const isLateNight = currentHour >= 22 || currentHour < 6;

  if (isLateNight) {
    return pick('late_night', lastMessage);
  }

  if (isEvening && factors.lateEveningCompression) {
    return pick('evening_heavy', lastMessage);
  }

  if (factors.timingCollision) {
    return pick('timing_collision', lastMessage);
  }

  if (factors.peopleStacking) {
    return pick('family_heavy', lastMessage);
  }

  return pick('general_high', lastMessage);
}
