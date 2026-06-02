import type { Confidence } from '@/types/capture';
import type { HouseholdImpactLevel } from '@/types/relevance';
import type { LifeDomainId } from '@/types/life';

/** Meridian notification candidate kinds — no re-engagement type. */
export type NotificationCandidateType =
  | 'morning_brief'
  | 'transition_awareness'
  | 'evening_wind_down'
  | 'critical_commitment_protection'
  | 'leave_alert'
  | 'capture_reminder';

export type NotificationSuppressionReason =
  | 'recently_opened_app'
  | 'low_household_impact'
  | 'low_time_sensitivity'
  | 'duplicate_awareness'
  | 'inside_recovery_window'
  | 'recently_ignored_pattern'
  | 'insufficient_confidence'
  | 'already_resolved'
  | 'bundled_into_other_notification'
  | 'constitutional_failure'
  | 'daily_cap_reached'
  | 'outside_delivery_window'
  | 'no_actionable_content'
  | 'silence_preferred';

export type NotificationTimingSensitivity = 'low' | 'medium' | 'high';

export type NotificationDecision = 'send' | 'suppress';

/**
 * Raw candidate before suppression — no notification exists by default.
 * Suppression reason is set by the engine when withheld.
 */
export type NotificationCandidate = {
  id: string;
  type: NotificationCandidateType;
  sourceEventId: string | null;
  sourceCaptureIds: string[];
  sourceDomain: LifeDomainId | null;
  sourcePeople: string[];
  generatedAt: Date;
  targetWindowStart: Date;
  targetWindowEnd: Date;
  householdImpact: HouseholdImpactLevel;
  timingSensitivity: NotificationTimingSensitivity;
  confidence: Confidence;
  interruptionReason: string;
  suppressionReason: NotificationSuppressionReason | null;
  bundleKey: string;
  /** Event-first primary line — commitment leads. */
  primaryLine: string;
  /** Prep, timing, or secondary context — subordinate. */
  secondaryLine: string | null;
  /** Additional lines for multi-commitment synthesis (morning brief, bundles). */
  additionalLines: string[];
  conflictRisk: number;
  prepRelevance: number;
};

/** Internal ranking aid — never shown to users. */
export type InterruptionScore = {
  total: number;
  householdImpact: number;
  timingSensitivity: number;
  conflictRisk: number;
  prepRelevance: number;
  peopleImpact: number;
  confidence: number;
};

export type ScoredNotificationCandidate = NotificationCandidate & {
  interruptionScore: InterruptionScore;
};

export type ProcessedNotificationCandidate = ScoredNotificationCandidate & {
  decision: NotificationDecision;
  bundledIntoId: string | null;
};

/** One earned interruption — multiple candidates may collapse here. */
export type NotificationBundle = {
  id: string;
  bundleKey: string;
  type: NotificationCandidateType;
  candidateIds: string[];
  title: string;
  lines: string[];
  decision: NotificationDecision;
  suppressionReason: NotificationSuppressionReason | null;
  interruptionReason: string;
  targetWindowStart: Date;
  targetWindowEnd: Date;
  householdImpact: HouseholdImpactLevel;
  interruptionScore: InterruptionScore;
};

export type NotificationAuditAction =
  | 'generated'
  | 'suppressed'
  | 'bundled'
  | 'approved';

export type NotificationAuditEntry = {
  at: Date;
  action: NotificationAuditAction;
  candidateId: string;
  candidateType: NotificationCandidateType;
  interruptionReason: string;
  suppressionReason: NotificationSuppressionReason | null;
  bundleId: string | null;
  bundleKey: string;
  decision: NotificationDecision;
};

export type NotificationDailyCaps = {
  morningBrief: number;
  eveningWindDown: number;
  transitionAwareness: number;
  criticalProtectionExempt: boolean;
  leaveAlert: number;
  captureReminder: number;
};

export type NotificationIntelligenceSnapshot = {
  generatedAt: Date;
  candidates: ProcessedNotificationCandidate[];
  bundles: NotificationBundle[];
  /** Eligible SEND bundles — delivery layer consumes later; no push in v1. */
  approvedBundles: NotificationBundle[];
  auditLog: NotificationAuditEntry[];
};

export type NotificationTraceStage =
  | 'generated'
  | 'constitutional_check'
  | 'suppression'
  | 'bundling'
  | 'daily_caps';

export type NotificationTraceOutcome = 'pass' | 'fail' | 'skipped';

export type NotificationDecisionTraceStep = {
  stage: NotificationTraceStage;
  outcome: NotificationTraceOutcome;
  detail: string | null;
};

export type NotificationVerificationTrace = {
  candidateId: string;
  type: NotificationCandidateType;
  typeLabel: string;
  steps: NotificationDecisionTraceStep[];
  finalDecision: 'approved' | 'suppressed';
  finalReason: string | null;
};

export type NotificationFeedRow = {
  id: string;
  type: NotificationCandidateType;
  typeLabel: string;
  decision: NotificationDecision;
  reason: string | null;
  timing: string;
  relatedEvent: string | null;
  relatedPeople: string;
  primaryLine: string;
  isPreview: boolean;
};

export type NotificationBundlingReview = {
  before: Array<{
    id: string;
    type: NotificationCandidateType;
    primaryLine: string;
  }>;
  after: NotificationBundle[];
};

export type NotificationSystemStatus =
  | 'silent'
  | 'candidates_suppressed'
  | 'would_send';

export type NotificationVerificationSnapshot = {
  intelligence: NotificationIntelligenceSnapshot;
  traces: NotificationVerificationTrace[];
  feed: {
    generated: NotificationFeedRow[];
    suppressed: NotificationFeedRow[];
    bundled: NotificationFeedRow[];
    approved: NotificationFeedRow[];
  };
  bundlingReview: NotificationBundlingReview;
  previewsByType: Partial<Record<NotificationCandidateType, NotificationFeedRow[]>>;
  /** Why Meridian earned silence — especially when counts are zero. */
  silenceReasons: string[];
  systemStatus: NotificationSystemStatus;
};
