/**
 * scripts/qa-response-filter.ts — Response filter QA
 * Run: npx tsx scripts/qa-response-filter.ts
 */

import { filterMeridianResponse } from "../lib/cognition/response-filter";

interface Case {
  name:         string;
  raw:          string;
  tone:         string;
  userMessage:  string;
  memoryHints?: string[];
  expect:       (out: string) => boolean;
}

const cases: Case[] = [
  {
    name: "generic advice removal — assistant phrase",
    raw: "Would you like me to help you set up a system for this?",
    tone: "neutral",
    userMessage: "I'm stressed about work.",
    expect: (o) => !/would you like me to/i.test(o),
  },
  {
    name: "multiple question reduction",
    raw: "What's the main blocker? Is it time or energy? What would help most?",
    tone: "overwhelmed",
    userMessage: "Too much going on.",
    expect: (o) => (o.match(/\?/g) ?? []).length <= 1,
  },
  {
    name: "Have you considered rewrite",
    raw: "Have you considered setting up a template to make reports more efficient?",
    tone: "planning",
    userMessage: "Monday reports drain me.",
    memoryHints: ["You already have templates — the transition into Monday mode is the hard part"],
    expect: (o) => !/have you considered/i.test(o) && o.length > 20,
  },
  {
    name: "launch pad suppression",
    raw: "Try using a launch pad checklist each morning. That might help you focus.",
    tone: "neutral",
    userMessage: "I'm tired today.",
    expect: (o) => !/launch pad/i.test(o) && !/checklist/i.test(o),
  },
  {
    name: "emotional over-validation cleanup",
    raw: "I understand. That sounds really hard. It's completely normal to feel this way. How does that make you feel?",
    tone: "emotional",
    userMessage: "I feel like I'm failing.",
    expect: (o) =>
      !/^I understand/i.test(o) &&
      !/completely normal/i.test(o) &&
      !/how does that make you feel/i.test(o),
  },
  {
    name: "low energy shortening",
    raw: "You might want to rest first. Then maybe pick one small thing. Or try a short walk. Also consider hydration.",
    tone: "low_energy",
    userMessage: "I'm wiped out.",
    expect: (o) => o.split(/[.!?]+/).filter(Boolean).length <= 2,
  },
  {
    name: "It sounds like opener removed",
    raw: "It sounds like you're feeling overwhelmed. Pick one thing for tomorrow.",
    tone: "overwhelmed",
    userMessage: "Too much tomorrow.",
    expect: (o) => !/^It sounds like/i.test(o),
  },
  {
    name: "allows template when user asked",
    raw: "Your template setup looks fine — the issue is timing, not the spreadsheet.",
    tone: "planning",
    userMessage: "My report template isn't working.",
    expect: (o) => /template/i.test(o),
  },
  {
    name: "no meta mentions",
    raw: "Based on your stored memories, you prefer calm mornings. The tone state suggests rest.",
    tone: "neutral",
    userMessage: "How should I start tomorrow?",
    expect: (o) =>
      !/memory/i.test(o) &&
      !/tone state/i.test(o) &&
      !/stored/i.test(o),
  },
];

let passed = 0;
let failed = 0;

console.log("=== RESPONSE FILTER QA ===\n");

for (const c of cases) {
  const out = filterMeridianResponse({
    rawResponse:  c.raw,
    toneState:    c.tone,
    userMessage:  c.userMessage,
    memoryHints:  c.memoryHints,
  });
  const ok = c.expect(out);
  console.log(`${ok ? "✓" : "✗"} ${c.name}`);
  console.log(`  IN:  ${c.raw}`);
  console.log(`  OUT: ${out}\n`);
  if (ok) passed++; else failed++;
}

console.log(`=== ${passed}/${cases.length} passed ===`);
if (failed > 0) process.exitCode = 1;
