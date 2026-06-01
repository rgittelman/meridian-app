/**
 * lib/context/assemble.ts — Active context assembly.
 *
 * Builds the full context object injected into AI calls.
 * Combines memories, cognition (tone, patterns), and user prefs.
 */

import { retrieveForChat } from "@/lib/memory/retrieve";
import { getMemoriesForUser, getUserMemoryPreferences } from "@/lib/memory/db";
import { getProfile } from "@/lib/auth";
import { resolveProfileName } from "@/lib/auth/profile-utils";
import { createClient } from "@/lib/supabase/server";
import { compressConversation } from "./compress";
import { detectToneState } from "@/lib/cognition/tone-state";
import { getRhythmGuidance } from "@/lib/cognition/response-rhythm";
import { synthesizePatterns, patternsToHints } from "@/lib/cognition/pattern-synthesis";
import { buildMemoryInfluence } from "@/lib/cognition/trust";
import {
  isMemoryDebugEnabled,
  memoryLog,
  type ContextDebugLog,
  type RetrievalDebugLog,
} from "@/lib/memory/debug";
import type { RankedMemory } from "@/lib/memory/types";
import type {
  ToneAnalysis,
  SynthesizedPattern,
  MemoryInfluence,
} from "@/lib/cognition/types";

export interface ActiveContext {
  userName:               string | null;
  preferredTone:          string | null;
  memories:               RankedMemory[];
  compressedHistory:      string | null;
  tone:                   ToneAnalysis;
  rhythmGuidance:         string;
  patterns:               SynthesizedPattern[];
  patternHints:           string[];
  memoryInfluence:        MemoryInfluence[];
  memoryEnabled:          boolean;
  personalizationEnabled: boolean;
  debug?: {
    retrieval:  RetrievalDebugLog;
    context:    ContextDebugLog;
  };
}

interface AssembleOptions {
  userId:    string;
  query?:    string;
  messages?: { role: "user" | "assistant"; content: string }[];
}

async function getPreferredTone(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_preferences")
    .select("preferred_tone")
    .eq("user_id", userId)
    .single();
  return data?.preferred_tone ?? null;
}

/** Assemble full active context for an AI call. */
export async function assembleContext(
  options: AssembleOptions,
): Promise<ActiveContext> {
  const { userId, query, messages } = options;

  const [profile, prefs, allMemories, preferredTone] = await Promise.all([
    getProfile(),
    getUserMemoryPreferences(userId),
    getMemoriesForUser(userId, { limit: 30 }),
    getPreferredTone(userId),
  ]);

  const { memories: contextMemories, debug: retrievalDebug } = prefs.memory_enabled
    ? await retrieveForChat(userId, query)
    : { memories: [], debug: undefined };

  const compressedHistory =
    messages && messages.length > 4
      ? await compressConversation(messages)
      : null;

  const tone = detectToneState({ query, messages });
  const rhythmGuidance = getRhythmGuidance(tone.state);
  const patterns = synthesizePatterns(allMemories, 3);
  const patternHints = patternsToHints(patterns);
  const memoryInfluence = buildMemoryInfluence(contextMemories, retrievalDebug);

  const promptMemoryChars = contextMemories.reduce(
    (sum, m) => sum + (m.summary ?? m.content).length,
    0,
  );

  const context: ActiveContext = {
    userName:               profile ? resolveProfileName(profile) : null,
    preferredTone,
    memories:               contextMemories,
    compressedHistory,
    tone,
    rhythmGuidance,
    patterns,
    patternHints,
    memoryInfluence,
    memoryEnabled:          prefs.memory_enabled,
    personalizationEnabled: prefs.personalization_enabled,
  };

  if (isMemoryDebugEnabled()) {
    const contextDebug: ContextDebugLog = {
      memory_count:        contextMemories.length,
      memory_ids:          contextMemories.map((m) => m.id),
      tone_state:          tone.state,
      tone_signals:        tone.signals,
      patterns:            patterns.map((p) => p.label),
      pattern_hints:       patternHints,
      memory_influence:    memoryInfluence,
      compressed_history:  Boolean(compressedHistory),
      prompt_memory_chars: promptMemoryChars,
      rhythm_guidance_len: rhythmGuidance.length,
    };

    context.debug = {
      retrieval: retrievalDebug ?? {
        query: query ?? null,
        semantic_ids: [], recent_ids: [], important_ids: [],
        merged_ids: contextMemories.map((m) => m.id),
        scores: [],
      },
      context: contextDebug,
    };

    memoryLog("context:assembled", {
      tone: tone.state,
      pattern_count: patterns.length,
      ...contextDebug,
    });
  }

  return context;
}

/** Expose context assembly for dev test panel. */
export async function inspectContext(
  userId:   string,
  query?:   string,
  messages?: { role: "user" | "assistant"; content: string }[],
): Promise<ActiveContext> {
  return assembleContext({ userId, query, messages });
}
