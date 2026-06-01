import type { Confidence } from '@/types/capture';
import type { EmotionalWeight, PeopleImpact } from '@/services/priority/types';

/** Core life domains — living attention areas, not folders. */
export type LifeDomainId = 'family' | 'work' | 'community' | 'health' | 'personal';

export type LifeCommitmentKind = 'event' | 'capture' | 'prep';

/** A single commitment surfaced inside a domain. */
export type LifeCommitment = {
  id: string;
  title: string;
  kind: LifeCommitmentKind;
  domainId: LifeDomainId;
  personAnchor: string | null;
  startTime: Date | null;
  timingLabel: string | null;
  peopleImpact: PeopleImpact;
  timingSensitivity: 'low' | 'medium' | 'high';
  emotionalWeight: EmotionalWeight;
  linkedEventId?: string | null;
  isRecurring?: boolean;
};

export type PrepClusterSummary = {
  label: string;
  captureCount: number;
  linkedEventTitle: string | null;
  /** Calm readiness line for Life domain summaries */
  readinessLine?: string | null;
};

export type LifePersonAnchor = {
  name: string;
  previewLine: string | null;
  commitmentCount: number;
};

export type RecurringPattern = {
  id: string;
  domainId: LifeDomainId;
  label: string;
  personAnchor: string | null;
  cadenceHint: string;
  confidence: Confidence;
};

/** Internal attention signal — never shown as a score to users. */
export type AttentionLevel = 'quiet' | 'present' | 'active';

export type AttentionSignal = {
  level: AttentionLevel;
  /** 0–1 internal weight for Focus/Plan integration */
  pressure: number;
  factors: {
    eventDensity: number;
    prepDensity: number;
    recurringWeight: number;
    peopleWeight: number;
    timingWeight: number;
  };
};

export type LifeDomainSnapshot = {
  id: LifeDomainId;
  label: string;
  attention: AttentionSignal;
  previewLines: string[];
  /** e.g. "+2 more family commitments" when preview is capped for readability */
  previewOverflowLine: string | null;
  peopleAnchors: LifePersonAnchor[];
  upcomingCommitments: LifeCommitment[];
  activeCaptures: LifeCommitment[];
  prepClusters: PrepClusterSummary[];
  recurringPatterns: RecurringPattern[];
  hasActivity: boolean;
};

export type LifeDiagnostics = {
  domainAssignments: Array<{ sourceId: string; domainId: LifeDomainId; reason: string }>;
  attentionByDomain: Record<LifeDomainId, AttentionSignal>;
  peopleMappings: Array<{ person: string; domainId: LifeDomainId; commitmentIds: string[] }>;
  recurringDetections: RecurringPattern[];
};

export type LifeIntelligenceSnapshot = {
  generatedAt: Date;
  domains: LifeDomainSnapshot[];
  attentionByDomain: Record<LifeDomainId, AttentionSignal>;
  recurringPatterns: RecurringPattern[];
  diagnostics: LifeDiagnostics | null;
};
