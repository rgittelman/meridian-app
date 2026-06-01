import type { Confidence } from '@/types/capture';
import type { LifeDomainId } from '@/types/life';

/** Who the event belongs to — separate from calendar source. */
export type OwnerType =
  | 'person'
  | 'family'
  | 'community'
  | 'organization'
  | 'unknown';

export type AffectedPerson = {
  personId: string;
  displayName: string;
  confidence: Confidence;
};

/** Future settings: importance, visibility, weighting per source calendar. */
export type SourceCalendarPreferences = {
  importance?: 'low' | 'normal' | 'high';
  visibility?: 'show' | 'quiet';
  weighting?: number;
};

export type AttributionCandidate = {
  ownerType: OwnerType;
  personId: string | null;
  displayName: string | null;
  confidence: Confidence;
  reason: string;
};

/**
 * Dedicated ownership & attribution — never collapse source, owner, affected, domain.
 */
export type EventAttribution = {
  sourceCalendarId: string;
  sourceCalendarName: string;
  sourceCalendarDisplayLabel: string;

  ownerType: OwnerType;
  ownerConfidence: Confidence;
  ownerPersonId: string | null;
  ownerDisplayName: string | null;

  affectedPeople: AffectedPerson[];

  inferredDomain: LifeDomainId;
  domainConfidence: Confidence;

  /** Reserved for Calendar Importance / Visibility / Weighting (no UI yet). */
  sourcePreferences: SourceCalendarPreferences;

  /** Dev-only decision trail — stripped before persist if desired. */
  diagnostics?: {
    ownerCandidates: AttributionCandidate[];
    domainReason: string;
    affectedReason: string;
    decisionLog: string[];
  };
};
