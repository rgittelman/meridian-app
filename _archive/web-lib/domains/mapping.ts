/**
 * lib/domains/mapping.ts — Category → domain defaults.
 */

import type { MemoryCategory } from "@/lib/memory/types";
import type { LifeDomain } from "./types";

/** Primary domain associations per memory category. */
export const CATEGORY_DOMAINS: Record<MemoryCategory, LifeDomain[]> = {
  preferences:          ["life", "routines"],
  routines:             ["routines", "life"],
  recurring_goals:      ["goals", "productivity"],
  emotional_patterns:   ["emotional", "life"],
  health_patterns:      ["health", "emotional"],
  financial_behaviors:  ["money", "routines"],
  relationships:        ["relationships", "life"],
  work_context:         ["productivity", "life"],
  priorities:           ["goals", "productivity"],
  recurring_stressors:  ["emotional", "productivity", "life"],
  wins_progress:        ["goals", "life"],
  unfinished_tasks:     ["productivity", "life"],
};

/** Domain-specific retrieval focus — categories + keywords hint. */
export const DOMAIN_FOCUS: Record<LifeDomain, {
  categories: MemoryCategory[];
  keywords:   string[];
}> = {
  life: {
    categories: ["routines", "relationships", "recurring_stressors", "priorities", "preferences"],
    keywords:   ["routine", "relationship", "stress", "priority", "life"],
  },
  health: {
    categories: ["health_patterns", "routines", "emotional_patterns"],
    keywords:   ["sleep", "energy", "exercise", "health", "supplement", "rest"],
  },
  money: {
    categories: ["financial_behaviors", "priorities", "recurring_stressors"],
    keywords:   ["spend", "budget", "bill", "money", "financial", "saving"],
  },
  productivity: {
    categories: ["work_context", "unfinished_tasks", "priorities", "recurring_stressors"],
    keywords:   ["work", "task", "deadline", "project", "focus", "overwhelm"],
  },
  relationships: {
    categories: ["relationships", "emotional_patterns"],
    keywords:   ["friend", "partner", "family", "relationship"],
  },
  emotional: {
    categories: ["emotional_patterns", "recurring_stressors", "health_patterns"],
    keywords:   ["stress", "anxious", "feel", "mood", "overwhelm"],
  },
  routines: {
    categories: ["routines", "preferences", "health_patterns"],
    keywords:   ["morning", "evening", "habit", "routine", "daily"],
  },
  goals: {
    categories: ["recurring_goals", "priorities", "wins_progress"],
    keywords:   ["goal", "priority", "building", "long-term"],
  },
};
