/**
 * Meridian Memory — category labels and display metadata.
 */

import type { MemoryCategory } from "./types";

export const MEMORY_CATEGORY_LABELS: Record<MemoryCategory, string> = {
  preferences:          "Preferences",
  routines:             "Routines",
  recurring_goals:      "Recurring Goals",
  emotional_patterns:   "Emotional Patterns",
  health_patterns:      "Health Patterns",
  financial_behaviors:  "Financial Behaviors",
  relationships:        "Relationships",
  work_context:         "Work Context",
  priorities:           "Priorities",
  recurring_stressors:  "Recurring Stressors",
  wins_progress:        "Wins & Progress",
  unfinished_tasks:     "Unfinished Tasks",
};

export const MEMORY_CATEGORY_DESCRIPTIONS: Record<MemoryCategory, string> = {
  preferences:          "How you like things done — tone, timing, style.",
  routines:             "Daily or weekly patterns Meridian has noticed.",
  recurring_goals:      "Long-term aims you return to again and again.",
  emotional_patterns:   "How you tend to feel in certain situations.",
  health_patterns:      "Sleep, energy, exercise, and wellness habits.",
  financial_behaviors:  "Spending, saving, and money-related tendencies.",
  relationships:        "People who matter and how you show up for them.",
  work_context:         "Projects, roles, and professional priorities.",
  priorities:           "What matters most to you right now.",
  recurring_stressors:  "Sources of mental load Meridian has detected.",
  wins_progress:        "Achievements and forward momentum.",
  unfinished_tasks:     "Open loops and things still on your mind.",
};

/** Default embedding model dimensions per provider. */
export const EMBEDDING_DIMENSIONS = {
  "nomic-embed-text": 768,
  "text-embedding-3-small": 1536,
} as const;

/** Minimum confidence to persist a memory from ingestion. */
export const MIN_INGEST_CONFIDENCE = 0.55;

/** Jaccard similarity threshold above which memories are considered duplicates. */
export const DEDUPE_SIMILARITY_THRESHOLD = 0.72;
