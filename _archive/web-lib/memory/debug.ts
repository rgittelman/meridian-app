/**
 * lib/memory/debug.ts — Development logging for the memory loop.
 *
 * Enabled when NODE_ENV=development or MEMORY_DEBUG=true.
 * All logs are server-safe strings — never include raw tokens or credentials.
 */

import type { MemoryInfluence } from "@/lib/cognition/types";

const ENABLED =
  process.env.NODE_ENV === "development" ||
  process.env.MEMORY_DEBUG === "true";

export function isMemoryDebugEnabled(): boolean {
  return ENABLED;
}

export function memoryLog(
  tag:  string,
  data: Record<string, unknown>,
): void {
  if (!ENABLED) return;
  console.log(`[memory:${tag}]`, JSON.stringify(data, null, 2));
}

export interface IngestRejectReason {
  title?:  string;
  reason:  string;
}

export interface IngestDebugLog {
  extracted_count:  number;
  candidates:       { title: string; category: string; confidence: number }[];
  rejected:         IngestRejectReason[];
  duplicates:       { title: string; existing_id: string; existing_title: string }[];
  created_ids:      string[];
  reinforced_ids:   string[];
}

export interface RetrievalDebugLog {
  query:              string | null;
  semantic_ids:       string[];
  recent_ids:         string[];
  important_ids:      string[];
  merged_ids:         string[];
  scores:             { id: string; title: string; score: number; breakdown: Record<string, number> }[];
}

export interface ContextDebugLog {
  memory_count:        number;
  memory_ids:          string[];
  tone_state:          string;
  tone_signals:        string[];
  patterns:            string[];
  pattern_hints:       string[];
  memory_influence:    MemoryInfluence[];
  compressed_history:  boolean;
  prompt_memory_chars: number;
  rhythm_guidance_len: number;
}
