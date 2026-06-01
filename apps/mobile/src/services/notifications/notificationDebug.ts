import type {
  NotificationAuditEntry,
  NotificationBundle,
  ProcessedNotificationCandidate,
} from '@/types/notification';
import { isDevEnvironment } from '@/utils/isDev';

export function logNotificationAudit(
  auditLog: NotificationAuditEntry[],
  approved: NotificationBundle[],
  candidates: ProcessedNotificationCandidate[],
): void {
  if (!isDevEnvironment()) return;

  const generated = auditLog.filter((e) => e.action === 'generated').length;
  const suppressed = auditLog.filter((e) => e.action === 'suppressed').length;
  const bundled = auditLog.filter((e) => e.action === 'bundled').length;
  const approvedCount = auditLog.filter((e) => e.action === 'approved').length;

  console.log('[Notification Intelligence] ─── audit ───');
  console.log('[Notification Intelligence] generated:', generated);
  console.log('[Notification Intelligence] suppressed:', suppressed);
  console.log('[Notification Intelligence] bundled:', bundled);
  console.log('[Notification Intelligence] approved:', approvedCount);
  console.log('[Notification Intelligence] send-ready bundles:', approved.length);

  for (const entry of auditLog.slice(0, 24)) {
    console.log('[Notification Intelligence] entry', {
      action: entry.action,
      type: entry.candidateType,
      interruptionReason: entry.interruptionReason,
      suppressionReason: entry.suppressionReason,
      bundleKey: entry.bundleKey,
      bundleId: entry.bundleId,
      decision: entry.decision,
    });
  }

  for (const c of candidates.filter((x) => x.decision === 'suppress').slice(0, 8)) {
    console.log('[Notification Intelligence] suppressed candidate', {
      id: c.id,
      type: c.type,
      reason: c.suppressionReason,
      score: c.interruptionScore.total,
    });
  }
}
