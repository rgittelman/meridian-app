/**
 * Meridian Memory — core type definitions.
 *
 * These types are the contract between ingestion, retrieval, storage,
 * and the Settings Memory Center UI.
 */

// ── Memory categories ─────────────────────────────────────────────────────────

export const MEMORY_CATEGORIES = [
  "preferences",
  "routines",
  "recurring_goals",
  "emotional_patterns",
  "health_patterns",
  "financial_behaviors",
  "relationships",
  "work_context",
  "priorities",
  "recurring_stressors",
  "wins_progress",
  "unfinished_tasks",
] as const;

export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

// ── Source & emotion enums ────────────────────────────────────────────────────

export type MemorySourceType =
  | "conversation"
  | "onboarding"
  | "integration"
  | "reflection"
  | "manual";

export type EmotionalValence = "positive" | "negative" | "neutral" | "mixed";

export type MemoryRelationshipType =
  | "related"
  | "supersedes"
  | "reinforces"
  | "contradicts";

// ── Core memory object ────────────────────────────────────────────────────────

export interface Memory {
  id:                   string;
  user_id:              string;
  category:             MemoryCategory;
  title:                string;
  content:              string;
  summary:              string | null;
  confidence:           number;
  importance:           number;
  emotional_valence:    EmotionalValence | null;
  emotional_intensity:  number;
  source_type:          MemorySourceType;
  source_id:            string | null;
  source_excerpt:       string | null;
  why_remembered:       string | null;
  metadata:             Record<string, unknown>;
  domains:              string[];
  reinforcement_count:  number;
  last_reinforced_at:   string;
  is_active:            boolean;
  created_at:           string;
  updated_at:           string;
}

export interface MemoryEmbedding {
  id:         string;
  memory_id:  string;
  user_id:    string;
  model:      string;
  embedding:  number[];
  created_at: string;
}

export interface MemoryRelationship {
  id:                 string;
  user_id:            string;
  source_memory_id:   string;
  target_memory_id:   string;
  relationship_type:  MemoryRelationshipType;
  strength:           number;
  created_at:         string;
}

export interface DailyReflection {
  id:              string;
  user_id:         string;
  reflection_date: string;
  summary:         string;
  emotional_tone:  string | null;
  key_themes:      string[];
  memory_ids:      string[];
  insights:        Record<string, unknown>;
  created_at:      string;
}

// ── Pipeline types ────────────────────────────────────────────────────────────

/** Raw insight extracted from a conversation before persistence. */
export interface ExtractedMemory {
  category:            MemoryCategory;
  title:               string;
  content:             string;
  summary?:            string;
  confidence:          number;
  importance?:         number;
  emotional_valence?:  EmotionalValence;
  emotional_intensity?: number;
  why_remembered:      string;
  source_excerpt?:     string;
}

/** A memory with its retrieval score attached. */
export interface RankedMemory extends Memory {
  score:           number;
  score_breakdown: MemoryScoreBreakdown;
}

export interface MemoryScoreBreakdown {
  semantic:    number;
  recency:     number;
  importance:  number;
  confidence:  number;
  reinforcement: number;
}

export interface MemoryRetrievalOptions {
  query?:              string;
  categories?:         MemoryCategory[];
  domains?:            string[];
  limit?:              number;
  minConfidence?:      number;
  excludeCategories?:  MemoryCategory[];
}

export interface MemoryIngestInput {
  userId:       string;
  messages:     { role: "user" | "assistant"; content: string }[];
  sourceType?:  MemorySourceType;
  sourceId?:    string;
}

export interface MemoryIngestResult {
  created:    Memory[];
  reinforced: Memory[];
  skipped:    number;
  debug?:     import("./debug").IngestDebugLog;
}

export interface UserMemoryPreferences {
  memory_enabled:              boolean;
  personalization_enabled:     boolean;
  disabled_memory_categories:  MemoryCategory[];
}
