/**
 * scripts/qa-live-responses.ts — Live LLM response QA via Ollama
 * Run: npx tsx scripts/qa-live-responses.ts
 */

import { detectToneState } from "../lib/cognition/tone-state";
import { getRhythmGuidance } from "../lib/cognition/response-rhythm";
import { buildChatSystemPrompt } from "../lib/ai/prompts";
import type { RankedMemory } from "../lib/memory/types";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const MODEL = process.env.OLLAMA_CHAT_MODEL ?? "llama3:latest";

async function chat(userMessage: string, extra?: {
  messages?: { role: "user" | "assistant"; content: string }[];
  memories?: RankedMemory[];
  patternHints?: string[];
}): Promise<string> {
  const tone = detectToneState({ query: userMessage, messages: extra?.messages });
  const rhythm = getRhythmGuidance(tone.state);
  const system = buildChatSystemPrompt({
    toneState: tone.state,
    rhythmGuidance: rhythm,
    memories: extra?.memories,
    patternHints: extra?.patternHints,
  });

  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        ...(extra?.messages ?? []),
        { role: "user", content: userMessage },
      ],
      stream: false,
      options: { temperature: 0.4, num_predict: 120 },
    }),
  });

  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.message?.content ?? "").trim();
}

function analyzeResponse(text: string) {
  const sentences = text.split(/[.!?]+/).filter(Boolean);
  const questions = (text.match(/\?/g) ?? []).length;
  const badOpenings = /^(I understand|That sounds|It seems like|It sounds like|I hear you|I'm sorry to hear)/i.test(text.trim());
  const badPhrases = [
    "I remember", "you told me", "Would you like me to",
    "I'm here to help", "That's completely valid", "You've got this",
  ].filter(p => text.includes(p));
  const hasList = /^[\s]*[-•*\d]/m.test(text) || (text.match(/\n-/g) ?? []).length >= 2;

  return {
    sentenceCount: sentences.length,
    questionCount: questions,
    badOpening: badOpenings,
    badPhrases,
    hasLongList: hasList && sentences.length > 4,
    length: text.length,
  };
}

function mockMemory(summary: string): RankedMemory {
  return {
    id: "1", user_id: "u", category: "routines", title: "Morning routine",
    content: summary, summary, confidence: 0.85, importance: 0.8,
    emotional_valence: "negative", emotional_intensity: 0.6,
    source_type: "conversation", source_id: null, source_excerpt: "",
    why_remembered: "Recurring pattern", metadata: {},
    domains: [],
    reinforcement_count: 3, last_reinforced_at: new Date().toISOString(),
    is_active: true, created_at: "", updated_at: "",
    score: 0.9, score_breakdown: { semantic: 0.9, recency: 0.8, importance: 0.8, confidence: 0.85, reinforcement: 0.5 },
  };
}

const tests = [
  { name: "1 Overwhelmed", msg: "I have too much going on tomorrow and I don't even know where to start.", maxSentences: 4, maxQuestions: 1 },
  { name: "2 Low energy", msg: "I'm wiped out and can't think straight.", maxSentences: 3, maxQuestions: 1 },
  { name: "3 Planning", msg: "Help me plan tomorrow morning.", maxSentences: 5, maxQuestions: 1 },
  { name: "5 Self-critical", msg: "I keep messing this up and I'm terrible at staying consistent.", maxSentences: 4, maxQuestions: 1 },
];

async function main() {
  console.log(`Model: ${MODEL}\n`);

  for (const t of tests) {
    const response = await chat(t.msg);
    const a = analyzeResponse(response);
    const pass = a.sentenceCount <= t.maxSentences && a.questionCount <= t.maxQuestions && !a.badOpening && a.badPhrases.length === 0 && !a.hasLongList;
    console.log(`${t.name} ${pass ? "✓" : "✗"}`);
    console.log(`  Response: ${response}`);
    console.log(`  Analysis:`, a);
    console.log();
  }

  // Memory recall scenario
  const history = [
    { role: "user" as const, content: "I get overwhelmed when my mornings are chaotic." },
    { role: "assistant" as const, content: "Chaotic mornings pull you off course fast — fewer switches early helps." },
  ];
  const memResponse = await chat("How should I structure tomorrow?", {
    messages: history,
    memories: [mockMemory("Calmer mornings with fewer context switches work better")],
    patternHints: ["Energy and mood seem linked to daily structure — calmer mornings correlate with better focus."],
  });
  const ma = analyzeResponse(memResponse);
  const memPass = !memResponse.includes("I remember") && !memResponse.includes("you told me") && !memResponse.includes("you said");
  console.log(`4 Memory recall ${memPass ? "✓" : "✗"}`);
  console.log(`  Response: ${memResponse}`);
  console.log(`  Analysis:`, ma);
  console.log();

  // Repetitive validation sequence
  console.log("6 Repetitive validation sequence");
  const emotionalMsgs = [
    "I'm really stressed about work.",
    "Everything feels like too much right now.",
    "I don't know if I can handle this week.",
  ];
  const responses: string[] = [];
  const conv: { role: "user" | "assistant"; content: string }[] = [];
  for (const msg of emotionalMsgs) {
    const r = await chat(msg, { messages: conv });
    responses.push(r);
    conv.push({ role: "user", content: msg });
    conv.push({ role: "assistant", content: r });
  }
  const openings = responses.map(r => r.trim().split(/[.!?\n]/)[0].slice(0, 30));
  const repeatedOpenings = new Set(openings).size < openings.length;
  const allBad = responses.every(r => !/^(I understand|That sounds|It seems like|It sounds like)/i.test(r.trim()));
  console.log(`  ${allBad && !repeatedOpenings ? "✓" : "✗"} openings:`, openings);
  responses.forEach((r, i) => console.log(`  [${i + 1}] ${r}`));
}

main().catch(e => { console.error(e); process.exit(1); });
