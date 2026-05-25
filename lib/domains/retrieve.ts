/**
 * lib/domains/retrieve.ts — Domain-filtered memory retrieval.
 */

import { retrieveMemories } from "@/lib/memory/retrieve";
import { getMemoriesForUser } from "@/lib/memory/db";
import { rankMemories } from "@/lib/memory/rank";
import { AI_CONFIG } from "@/lib/ai/config";
import type { RankedMemory } from "@/lib/memory/types";
import type { LifeDomain } from "./types";
import { DOMAIN_FOCUS } from "./mapping";
import { domainsFromScores, scoreDomains } from "./scoring";

function memoryMatchesDomain(
  memory: { category: string; domains?: string[]; title: string; content: string; emotional_intensity?: number },
  domain: LifeDomain,
): boolean {
  if (memory.domains?.includes(domain)) return true;

  const focus = DOMAIN_FOCUS[domain];
  if (focus.categories.includes(memory.category as never)) return true;

  const scores = scoreDomains({
    category:            memory.category as never,
    title:               memory.title,
    content:             memory.content,
    emotional_intensity: memory.emotional_intensity,
  });
  return (scores[domain] ?? 0) >= 0.45;
}

/** Retrieve memories scoped to a life domain. */
export async function retrieveForDomain(
  userId:  string,
  domain:  LifeDomain,
  query?:  string,
): Promise<RankedMemory[]> {
  const limit = Math.min(6, AI_CONFIG.maxMemoriesInPrompt);

  if (query) {
    const ranked = await retrieveMemories(userId, { query, limit: limit * 2 });
    return ranked.filter((m) => memoryMatchesDomain(m, domain)).slice(0, limit);
  }

  const all = await getMemoriesForUser(userId, { limit: 80 });
  const filtered = all.filter((m) => memoryMatchesDomain(m, domain));
  return rankMemories(filtered).slice(0, limit);
}

/** Domain context bundle for /health, /money, /life pages. */
export async function assembleDomainContext(
  userId: string,
  domain: LifeDomain,
  query?: string,
): Promise<{
  domain:    LifeDomain;
  memories:  RankedMemory[];
  themes:    string[];
}> {
  const memories = await retrieveForDomain(userId, domain, query);
  const themes = memories
    .slice(0, 4)
    .map((m) => m.summary ?? m.title);

  return { domain, memories, themes };
}

/** Recompute domains for a memory at ingest/reinforce time. */
export function computeMemoryDomains(input: {
  category:            string;
  title:               string;
  content:             string;
  emotional_intensity?: number;
  emotional_valence?:  string | null;
}): string[] {
  const scores = scoreDomains({
    category:            input.category as never,
    title:               input.title,
    content:             input.content,
    emotional_intensity: input.emotional_intensity,
    emotional_valence:   input.emotional_valence,
  });
  return domainsFromScores(scores);
}
