import type { LifeObject } from '@/types/capture';
import type { MeridianCalendarEvent } from '@/types/calendar';
import type { LifeDomainId } from '@/types/life';

export type PrepReadinessState =
  | 'ready'
  | 'mostly_ready'
  | 'needs_attention'
  | 'no_prep_detected'
  | 'not_yet_relevant';

export type PreparationWindowProfile =
  | 'pickup'
  | 'sports'
  | 'board'
  | 'work_prep'
  | 'school'
  | 'travel'
  | 'medical'
  | 'community'
  | 'default';

export type PreparationWindow = {
  profile: PreparationWindowProfile;
  /** Hours before event when prep awareness may open */
  opensHoursBefore: number;
  /** Hours before event when prep awareness closes (usually 0 = until start) */
  closesHoursBefore: number;
  isActive: boolean;
  hoursUntilStart: number;
};

/** Full prep awareness object — not a project or task list. */
export type PrepCluster = {
  id: string;
  eventId: string;
  event: MeridianCalendarEvent;
  eventTitle: string;
  domainId: LifeDomainId;
  linkedCaptures: LifeObject[];
  relatedCaptureIds: string[];
  peopleContext: string[];
  readiness: PrepReadinessState;
  window: PreparationWindow;
  priorityScore: number;
  shouldSurface: boolean;
  suppressionReason: string | null;
};

export type PlanPrepContext = {
  line: string;
  readiness: PrepReadinessState;
};

export type PrepAwarenessItem = {
  id: string;
  eventId: string;
  eventTitle: string;
  /** Primary label — event-first, optionally prefixed with person context. */
  primaryLabel: string;
  /** Timing, owner, or source — subordinate to the commitment. */
  contextLine: string;
  body: string;
  connectedSummary: string | null;
  readiness: PrepReadinessState;
};

export type PrepDiagnostics = {
  enteringWindow: string[];
  generated: number;
  surfaced: number;
  suppressed: Array<{ eventId: string; title: string; reason: string }>;
  clusters: Array<{
    eventId: string;
    title: string;
    readiness: PrepReadinessState;
    captureCount: number;
    windowActive: boolean;
    priorityScore: number;
  }>;
};

export type PrepIntelligenceSnapshot = {
  generatedAt: Date;
  clusters: PrepCluster[];
  byEventId: ReadonlyMap<string, PrepCluster>;
  surfacedForFocus: PrepAwarenessItem[];
  /** Prep threads eligible for Focus but not shown (cap 1–2 cards). */
  focusPrepOverflowCount: number;
  planContextByEventId: ReadonlyMap<string, PlanPrepContext>;
};
