/**
 * lib/ai/prompts.ts — Memory-aware system prompt builder.
 *
 * Compact prompt construction — voice, rhythm, and memory hints only.
 * Keeps token footprint small while shaping human-like responses.
 */

import type { RankedMemory } from "@/lib/memory/types";
import type { ToneState } from "@/lib/cognition/types";

const MERIDIAN_IDENTITY = `You are Meridian — a clear-minded thinking partner, not an assistant or coach.
Reduce mental load. Be calm, concise, observant, grounded.
Speak like someone who understands patterns over time. Never generic. Never chatty.
Do not perform empathy. Do not coach. Do not cheerfully validate.
Do not offer menus of help or numbered suggestions.
Never say "I remember", "you told me", "great question", or "that's a great start".
Never open with "I" — lead with observation or the subject itself.
Prefer silence over filler. If you have nothing meaningful to add, say less.`;

interface PromptContext {
  userName?:           string;
  preferredTone?:      string | null;
  memories?:           RankedMemory[];
  compressedHistory?:  string;
  toneState?:          ToneState;
  rhythmGuidance?:     string;
  patternHints?:       string[];
}

/** Format memories as internal observation hints — no categories, no titles. */
function formatMemoryHints(memories: RankedMemory[]): string {
  return memories
    .map((m) => `- ${m.summary ?? m.content}`)
    .join("\n");
}

/** Build the full system prompt for chat completions. */
export function buildChatSystemPrompt(ctx: PromptContext = {}): string {
  const sections: string[] = [MERIDIAN_IDENTITY];

  if (ctx.userName) {
    sections.push(`User: ${ctx.userName}.`);
  }

  if (ctx.preferredTone) {
    sections.push(`Tone preference: ${ctx.preferredTone}.`);
  }

  if (ctx.memories && ctx.memories.length > 0) {
    sections.push(
      `Background knowledge (internal — never quote, never say "I remember" or "you told me"):\n${formatMemoryHints(ctx.memories)}\nBlend into reasoning naturally. Reference patterns subtly.`,
    );
  }

  if (ctx.patternHints && ctx.patternHints.length > 0) {
    sections.push(
      `Internal patterns (influence quietly, never surface verbatim):\n${ctx.patternHints.map((p) => `- ${p}`).join("\n")}`,
    );
  }

  if (ctx.compressedHistory) {
    sections.push(`Recent context:\n${ctx.compressedHistory}`);
  }

  if (ctx.rhythmGuidance) {
    sections.push(`Response rhythm:\n${ctx.rhythmGuidance}`);
  } else {
    sections.push(
      "Response rhythm: 1-3 sentences. One question at most. No filler openings. No lists unless explicitly asked.",
    );
  }

  return sections.join("\n\n");
}

/** Prompt for extracting long-term memories from a conversation. */
export function buildMemoryExtractionPrompt(
  conversation: string,
  existingTitles: string[],
): string {
  const existingBlock = existingTitles.length > 0
    ? `\nAlready stored (do NOT duplicate):\n${existingTitles.map((t) => `- ${t}`).join("\n")}`
    : "";

  return `Analyze this conversation and extract ONLY meaningful long-term insights worth remembering.

Return a JSON array. Each item:
{
  "category": "<one of: preferences, routines, recurring_goals, emotional_patterns, health_patterns, financial_behaviors, relationships, work_context, priorities, recurring_stressors, wins_progress, unfinished_tasks>",
  "title": "<short label, max 8 words>",
  "content": "<1-2 sentence memory>",
  "summary": "<one-line summary>",
  "confidence": <0.0-1.0>,
  "importance": <0.0-1.0>,
  "emotional_valence": "<positive|negative|neutral|mixed>",
  "emotional_intensity": <0.0-1.0>,
  "why_remembered": "<why this matters long-term, 1 sentence>"
}

Rules:
- Only extract insights with confidence >= 0.55
- Skip greetings, small talk, and one-off questions
- Prioritize recurring themes, emotional intensity, and long-term goals
- Deprioritize generic preferences and shallow one-off facts
- Never extract passwords, tokens, API keys, or credentials
- Return [] if nothing worth remembering
- Maximum 3 memories per conversation${existingBlock}

Conversation:
${conversation}

JSON array only, no markdown:`;
}

/** Prompt for daily reflection generation. */
export function buildReflectionPrompt(
  memories: { title: string; category: string; content: string }[],
  date: string,
): string {
  const memoryBlock = memories
    .map((m) => `- ${m.content}`)
    .join("\n");

  return `Generate a calm daily reflection for ${date} based on these memories.

Return JSON:
{
  "summary": "<2-3 sentence reflection, warm and grounded>",
  "emotional_tone": "<one word: calm|focused|stressed|energized|reflective|neutral>",
  "key_themes": ["<theme1>", "<theme2>"],
  "insights": { "pattern": "<optional recurring pattern noticed>" }
}

Memories from today:
${memoryBlock}

JSON only:`;
}

/** Prompt for compressing recent conversation history. */
export function buildCompressionPrompt(messages: { role: string; content: string }[]): string {
  const transcript = messages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  return `Summarize this conversation in 2-3 sentences, preserving key facts and emotional context.
Be concise. No preamble.

${transcript}

Summary:`;
}
