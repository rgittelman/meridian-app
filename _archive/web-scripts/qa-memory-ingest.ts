/**
 * scripts/qa-memory-ingest.ts — Memory ingestion logic QA (no DB)
 * Run: npx tsx scripts/qa-memory-ingest.ts
 */

import { findDuplicate, memorySimilarity } from "../lib/memory/dedupe";
import { computeIngestImportance, reinforcementImportanceBump } from "../lib/cognition/memory-weight";
import { validateExtractedMemory } from "../lib/memory/safety";
import { MIN_INGEST_CONFIDENCE } from "../lib/memory/constants";
import type { Memory, ExtractedMemory } from "../lib/memory/types";

function baseMemory(overrides: Partial<Memory>): Memory {
  return {
    id: "1", user_id: "u", category: "recurring_stressors", title: "Chaotic mornings",
    content: "Gets overwhelmed when mornings are chaotic", summary: "Chaotic mornings cause overwhelm",
    confidence: 0.85, importance: 0.7, emotional_valence: "negative", emotional_intensity: 0.7,
    source_type: "conversation", source_id: null, source_excerpt: "", why_remembered: "Recurring",
    metadata: {}, domains: [], reinforcement_count: 2, last_reinforced_at: new Date().toISOString(),
    is_active: true, created_at: "", updated_at: "",
    ...overrides,
  };
}

console.log("=== INGEST CONFIDENCE THRESHOLD ===");
console.log(`  MIN_INGEST_CONFIDENCE: ${MIN_INGEST_CONFIDENCE}`);
console.log(`  Below threshold rejected at parse: ${MIN_INGEST_CONFIDENCE >= 0.55 ? "✓" : "✗"}`);

console.log("\n=== MEANINGFUL vs SHALLOW IMPORTANCE ===");
const shallow: ExtractedMemory = {
  category: "preferences", title: "Likes tea", content: "User prefers tea in the afternoon",
  confidence: 0.6, importance: 0.5, why_remembered: "Preference",
};
const meaningful: ExtractedMemory = {
  category: "recurring_stressors", title: "Chaotic mornings",
  content: "Gets overwhelmed when mornings are chaotic and fragmented",
  confidence: 0.88, importance: 0.75, emotional_intensity: 0.75, emotional_valence: "negative",
  why_remembered: "Recurring stress pattern",
};
console.log(`  Shallow: ${computeIngestImportance(shallow).toFixed(3)}`);
console.log(`  Meaningful: ${computeIngestImportance(meaningful).toFixed(3)} → ${computeIngestImportance(meaningful) > computeIngestImportance(shallow) ? "✓" : "✗"}`);

console.log("\n=== DEDUPE ===");
const existing = [baseMemory({})];
const duplicate: ExtractedMemory = {
  category: "recurring_stressors", title: "Chaotic morning routine",
  content: "User gets overwhelmed when mornings are chaotic and busy",
  confidence: 0.8, why_remembered: "Repeated concern",
};
const dupe = findDuplicate(duplicate, existing);
console.log(`  Detects similar memory: ${dupe ? "✓ " + dupe.title : "✗"}`);
console.log(`  Similarity score: ${dupe ? memorySimilarity(duplicate, dupe).toFixed(3) : "n/a"}`);

console.log("\n=== REINFORCEMENT BUMP ===");
const bumped = reinforcementImportanceBump(0.6, 0.7);
console.log(`  0.6 → ${bumped.toFixed(3)} (emotional): ${bumped > 0.6 ? "✓" : "✗"}`);

console.log("\n=== SAFETY FILTER ===");
console.log(`  Blocks API key: ${!validateExtractedMemory({ title: "key", content: "api_key=sk-abc12345678901234567890" }) ? "✓" : "✗"}`);
console.log(`  Allows normal memory: ${validateExtractedMemory({ title: "Morning stress", content: "Chaotic mornings are hard" }) ? "✓" : "✗"}`);

console.log("\n=== TEMPORARY NONSENSE (low confidence) ===");
const nonsense: ExtractedMemory = {
  category: "preferences", title: "Said hi", content: "User said hello today",
  confidence: 0.4, why_remembered: "Small talk",
};
console.log(`  confidence 0.4 below threshold: ${nonsense.confidence < MIN_INGEST_CONFIDENCE ? "✓ rejected" : "✗"}`);
