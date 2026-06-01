import type { Confidence } from '@/types/capture';

export type RelevanceLevel = 'high' | 'medium' | 'low';

export type HouseholdImpactLevel = 'high' | 'medium' | 'low' | 'none';

/** School calendars are context unless a household commitment is detected. */
export type CalendarSourceRole = 'commitment' | 'context';

/** Future: visibility overrides, relevance overrides, household mapping. */
export type RelevancePreferences = {
  visibilityOverride?: 'show' | 'hide' | 'default';
  relevanceOverride?: RelevanceLevel;
  sourceWeighting?: number;
};

export type EventRelevance = {
  relevanceScore: RelevanceLevel;
  relevanceReason: string;
  relevanceConfidence: Confidence;
  householdImpact: HouseholdImpactLevel;
  matchedHouseholdMembers: string[];
  sourceRole: CalendarSourceRole;
  /** True when event should feed Plan, Focus, Life, and downstream intelligence. */
  isRelevant: boolean;
  preferences: RelevancePreferences;
  diagnostics?: {
    suppressionReason?: string;
    householdMatch?: string;
    gradeSignals?: number[];
    teamsnapDetected?: boolean;
    humanizedDisplayTitle?: string;
    sportsChildInference?: string;
    personInferenceConfidence?: Confidence;
  };
};
