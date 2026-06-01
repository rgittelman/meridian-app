/**
 * scripts/qa-cognition.ts — Cognition layer QA checks
 * Run: npx tsx scripts/qa-cognition.ts
 */

import { detectToneState } from "../lib/cognition/tone-state";
import { getRhythmGuidance } from "../lib/cognition/response-rhythm";
import { buildChatSystemPrompt } from "../lib/ai/prompts";
import { computeIngestImportance, computeEffectiveImportance } from "../lib/cognition/memory-weight";
import { synthesizePatterns } from "../lib/cognition/pattern-synthesis";
import type { Memory, RankedMemory } from "../lib/memory/types";

const scenarios = [
  {
    id: 1,
    name: "Overwhelmed user",
    query: "I have too much going on tomorrow and I don't even know where to start.",
    expectTone: "overwhelmed" as const,
  },
  {
    id: 2,
    name: "Low energy user",
    query: "I'm wiped out and can't think straight.",
    expectTone: "low_energy" as const,
  },
  {
    id: 3,
    name: "Planning user",
    query: "Help me plan tomorrow morning.",
    expectTone: "planning" as const,
  },
  {
    id: 4,
    name: "Memory recall (planning follow-up)",
    query: "How should I structure tomorrow?",
    messages: [
      { role: "user" as const, content: "I get overwhelmed when my mornings are chaotic." },
      { role: "assistant" as const, content: "Chaotic mornings tend to pull you off course fast." },
    ],
    expectTone: "planning" as const,
  },
  {
    id: 5,
    name: "Self-critical user",
    query: "I keep messing this up and I'm terrible at staying consistent.",
    expectTone: "emotional" as const,
  },
];

function mockRankedMemory(summary: string): RankedMemory {
  const base: Memory = {
    id: "mem-1",
    user_id: "u",
    category: "routines",
    title: "Morning routine",
    content: summary,
    summary,
    confidence: 0.85,
    importance: 0.75,
    emotional_valence: "negative",
    emotional_intensity: 0.6,
    source_type: "conversation",
    source_id: null,
    source_excerpt: "",
    why_remembered: "Recurring stress pattern",
    metadata: {},
    domains: [],
    reinforcement_count: 3,
    last_reinforced_at: new Date().toISOString(),
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  return { ...base, score: 0.85, score_breakdown: { semantic: 0.8, recency: 0.7, importance: 0.75, confidence: 0.85, reinforcement: 0.5 } };
}

console.log("=== TONE + PROMPT SCENARIOS ===\n");

const results: Record<string, unknown>[] = [];

for (const s of scenarios) {
  const tone = detectToneState({ query: s.query, messages: s.messages });
  const rhythm = getRhythmGuidance(tone.state);
  const isStructure = s.query.includes("structure");
  const prompt = buildChatSystemPrompt({
    toneState: tone.state,
    rhythmGuidance: rhythm,
    memories: isStructure
      ? [mockRankedMemory("Calmer mornings with fewer context switches work better")]
      : [],
    patternHints: isStructure
      ? ["Energy and mood seem linked to daily structure — calmer mornings correlate with better focus."]
      : [],
  });

  const checks = {
    toneMatch: tone.state === s.expectTone,
    hasOverwhelmedRhythm: tone.state === "overwhelmed" ? rhythm.includes("one priority") : true,
    hasLowEnergyShort: tone.state === "low_energy" ? rhythm.includes("1-2 sentences") : true,
    hasPlanningStructured: tone.state === "planning" ? rhythm.includes("structured") : true,
    hasAntiFatigue: rhythm.includes("Never open with"),
    hasNoRememberRule: prompt.includes('never say "I remember"'),
    memoryInPrompt: isStructure ? prompt.includes("Calmer mornings") : true,
    noCategoryLabels: !prompt.includes("[Routines]") && !prompt.includes("[Preferences]"),
  };

  results.push({ id: s.id, name: s.name, detected: tone.state, expected: s.expectTone, signals: tone.signals, checks });

  console.log(`#${s.id} ${s.name}`);
  console.log(`  Tone: ${tone.state} (expected ${s.expectTone}) ${checks.toneMatch ? "✓" : "✗ FAIL"}`);
  console.log(`  Signals: ${tone.signals.join(", ") || "none"}`);
  console.log(`  Checks:`, checks);
  console.log();
}

console.log("=== EMOTIONAL SEQUENCE TONES ===\n");
const seq = [
  "I'm really stressed about work.",
  "Everything feels like too much right now.",
  "I don't know if I can handle this week.",
];
for (const q of seq) {
  const t = detectToneState({ query: q });
  console.log(`  "${q.slice(0, 40)}..." → ${t.state}`);
}

console.log("\n=== MEMORY WEIGHT ===\n");
const shallow = computeIngestImportance({
  category: "preferences", title: "Likes coffee", content: "User likes coffee",
  confidence: 0.6, importance: 0.5, why_remembered: "Preference",
});
const meaningful = computeIngestImportance({
  category: "recurring_stressors", title: "Chaotic mornings",
  content: "Gets overwhelmed when mornings are chaotic",
  confidence: 0.85, importance: 0.7, emotional_intensity: 0.7, emotional_valence: "negative",
  why_remembered: "Recurring stress",
});
console.log(`  Shallow pref: ${shallow.toFixed(3)}, Meaningful stressor: ${meaningful.toFixed(3)} → ${meaningful > shallow ? "✓" : "✗"}`);

console.log("\n=== PATTERN SYNTHESIS (self-criticism) ===\n");
const selfCritMems: Memory[] = [{
  id: "1", user_id: "u", category: "emotional_patterns", title: "Self-criticism",
  content: "Hard on myself about consistency", summary: "Tends to be hard on self about consistency",
  confidence: 0.8, importance: 0.7, emotional_valence: "negative", emotional_intensity: 0.65,
  source_type: "conversation", source_id: null, source_excerpt: "", why_remembered: null, metadata: {},
  domains: [],
  reinforcement_count: 2, last_reinforced_at: new Date().toISOString(), is_active: true,
  created_at: "", updated_at: "",
}];
const patterns = synthesizePatterns(selfCritMems);
console.log(`  Patterns found: ${patterns.map(p => p.kind).join(", ") || "none"}`);

const passed = results.filter(r => (r.checks as { toneMatch: boolean }).toneMatch).length;
const failed = results.length - passed;
console.log(`\n=== SUMMARY: ${passed}/${results.length} tone matches ===`);
if (failed > 0) process.exitCode = 1;
