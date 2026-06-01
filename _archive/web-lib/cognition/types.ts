/**
 * lib/cognition/types.ts — Cognitive operating system types.
 */

export type ToneState =
  | "low_energy"
  | "overwhelmed"
  | "planning"
  | "emotional"
  | "neutral";

export interface ToneAnalysis {
  state:      ToneState;
  confidence: number;
  signals:    string[];
}

export interface SynthesizedPattern {
  kind:        PatternKind;
  label:       string;
  /** Internal prompt hint — never shown to user verbatim */
  promptHint:  string;
  strength:    number;
  memoryIds:   string[];
}

export type PatternKind =
  | "stress_trigger"
  | "productivity_blocker"
  | "mood_energy"
  | "relationship_theme"
  | "recurring_goal"
  | "self_criticism"
  | "category_theme";

export interface MemoryInfluence {
  memoryId:      string;
  title:         string;
  category:      string;
  reason:        "semantic" | "recent" | "importance" | "pattern";
  whyRemembered: string | null;
}

export interface DailyBriefing {
  date:                 string;
  morningFocus:         string;
  emotionalTrend:       string;
  unresolvedThemes:     string[];
  recurringPriorities:  string[];
  overloadDetected:     boolean;
  patternSummary:       string[];
  generatedAt:          string;
}

export interface CognitionContext {
  tone:              ToneAnalysis;
  rhythmGuidance:    string;
  patterns:          SynthesizedPattern[];
  patternHints:      string[];
  memoryInfluence:   MemoryInfluence[];
}
