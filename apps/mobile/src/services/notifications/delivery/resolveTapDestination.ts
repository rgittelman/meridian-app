import type { NotificationCandidateType } from '@/types/notification';
import type { NotificationTapDestination } from '@/types/notificationDelivery';

/**
 * Tap routing design — implementation deferred.
 * Event-specific bundles open event context; briefs open Focus.
 */
export function resolveNotificationTapDestination(input: {
  type: NotificationCandidateType;
  primarySourceEventId: string | null;
  primarySourceCaptureId: string | null;
}): NotificationTapDestination {
  if (input.primarySourceEventId) {
    if (
      input.type === 'critical_commitment_protection' ||
      input.type === 'transition_awareness' ||
      input.type === 'leave_alert'
    ) {
      return { screen: 'event_detail', eventId: input.primarySourceEventId };
    }
  }

  if (input.primarySourceCaptureId && !input.primarySourceEventId) {
    return { screen: 'capture_detail', captureId: input.primarySourceCaptureId };
  }

  if (input.type === 'morning_brief' || input.type === 'evening_wind_down') {
    return { screen: 'focus' };
  }

  if (input.type === 'critical_commitment_protection') {
    return input.primarySourceEventId
      ? { screen: 'event_detail', eventId: input.primarySourceEventId }
      : { screen: 'plan' };
  }

  return { screen: 'plan' };
}
