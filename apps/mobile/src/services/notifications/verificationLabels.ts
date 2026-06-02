import type {
  NotificationCandidateType,
  NotificationSuppressionReason,
} from '@/types/notification';

const TYPE_LABELS: Record<NotificationCandidateType, string> = {
  morning_brief: 'Morning Brief',
  transition_awareness: 'Transition Awareness',
  evening_wind_down: 'Evening Wind-Down',
  critical_commitment_protection: 'Critical Commitment Protection',
  leave_alert: 'Leave Alert',
};

const SUPPRESSION_LABELS: Record<NotificationSuppressionReason, string> = {
  recently_opened_app: 'Recently opened app',
  low_household_impact: 'Low household impact',
  low_time_sensitivity: 'Low time sensitivity',
  duplicate_awareness: 'Duplicate awareness',
  inside_recovery_window: 'Inside recovery window',
  recently_ignored_pattern: 'Recently ignored pattern',
  insufficient_confidence: 'Insufficient confidence',
  already_resolved: 'Already resolved',
  bundled_into_other_notification: 'Bundled into another notification',
  constitutional_failure: 'Constitutional check failed',
  daily_cap_reached: 'Daily cap reached',
  outside_delivery_window: 'Outside delivery window',
  no_actionable_content: 'No actionable content',
  silence_preferred: 'Silence preferred',
};

export function notificationTypeLabel(type: NotificationCandidateType): string {
  return TYPE_LABELS[type];
}

export function suppressionReasonLabel(
  reason: NotificationSuppressionReason | string | null,
): string {
  if (!reason) return '—';
  if (reason in SUPPRESSION_LABELS) {
    return SUPPRESSION_LABELS[reason as NotificationSuppressionReason];
  }
  return reason.replace(/_/g, ' ');
}

export function formatTimingWindow(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const day = start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  return `${day} · ${fmt(start)} – ${fmt(end)}`;
}
