/**
 * lib/domains/scoring.ts — Domain scoring and cross-domain tagging.
 *
 * Heuristic-only — no LLM call. Runs at ingest time.
 */

import type { MemoryCategory } from "@/lib/memory/types";
import type { LifeDomain, DomainScores, DomainTag } from "./types";
import { LIFE_DOMAINS } from "./types";
import { CATEGORY_DOMAINS } from "./mapping";

/** Keyword boosts for cross-domain tagging from text content. */
const KEYWORD_DOMAINS: { pattern: RegExp; domains: LifeDomain[]; weight: number }[] = [
  { pattern: /\b(sleep|insomnia|tired|energy|exercise|workout|supplement|health)\b/i, domains: ["health"], weight: 0.35 },
  { pattern: /\b(spend|spending|budget|bill|money|financial|overspend|saving)\b/i, domains: ["money"], weight: 0.35 },
  { pattern: /\b(morning|evening|routine|habit|meal prep|daily)\b/i, domains: ["routines"], weight: 0.3 },
  { pattern: /\b(goal|priority|vision|long.?term|building toward)\b/i, domains: ["goals"], weight: 0.3 },
  { pattern: /\b(overwhelm|stress|anxious|feel|emotion|mood)\b/i, domains: ["emotional"], weight: 0.3 },
  { pattern: /\b(deadline|project|work|task|payroll|meeting|focus)\b/i, domains: ["productivity"], weight: 0.3 },
  { pattern: /\b(friend|partner|family|relationship|mom|dad)\b/i, domains: ["relationships"], weight: 0.3 },
  { pattern: /\b(eating out|dinner|lunch)\b/i, domains: ["money", "routines"], weight: 0.25 },
  { pattern: /\b(monday|morning).*(overwhelm|chaos)/i, domains: ["productivity", "emotional"], weight: 0.35 },
];

function clamp(n: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, n));
}

/** Score all domains for a memory candidate or stored memory. */
export function scoreDomains(input: {
  category:            MemoryCategory;
  title:               string;
  content:             string;
  emotional_intensity?: number;
  emotional_valence?:  string | null;
}): DomainScores {
  const text = `${input.title} ${input.content}`;
  const scores: DomainScores = {};

  for (const domain of CATEGORY_DOMAINS[input.category] ?? ["life"]) {
    scores[domain] = (scores[domain] ?? 0) + 0.55;
  }

  for (const { pattern, domains, weight } of KEYWORD_DOMAINS) {
    if (pattern.test(text)) {
      for (const d of domains) {
        scores[d] = (scores[d] ?? 0) + weight;
      }
    }
  }

  if ((input.emotional_intensity ?? 0) >= 0.45) {
    scores.emotional = (scores.emotional ?? 0) + 0.25;
  }

  if (input.emotional_valence === "negative" && (input.emotional_intensity ?? 0) >= 0.4) {
    scores.life = (scores.life ?? 0) + 0.15;
  }

  for (const d of LIFE_DOMAINS) {
    if (scores[d] !== undefined) scores[d] = clamp(scores[d]!);
  }

  return scores;
}

/** Tags above threshold, sorted by score descending. */
export function domainsFromScores(
  scores: DomainScores,
  threshold = 0.35,
): LifeDomain[] {
  return (Object.entries(scores) as [LifeDomain, number][])
    .filter(([, s]) => s >= threshold)
    .sort((a, b) => b[1] - a[1])
    .map(([d]) => d);
}

/** Full tag breakdown for trust/debug metadata. */
export function explainDomainTags(input: {
  category:            MemoryCategory;
  title:               string;
  content:             string;
  emotional_intensity?: number;
}): DomainTag[] {
  const scores = scoreDomains(input);
  const tags: DomainTag[] = [];

  for (const domain of CATEGORY_DOMAINS[input.category] ?? []) {
    tags.push({ domain, score: scores[domain] ?? 0.55, source: "category" });
  }

  const text = `${input.title} ${input.content}`;
  for (const { pattern, domains, weight } of KEYWORD_DOMAINS) {
    if (pattern.test(text)) {
      for (const d of domains) {
        if (!tags.some((t) => t.domain === d && t.source === "keyword")) {
          tags.push({ domain: d, score: (scores[d] ?? 0), source: "keyword" });
        }
      }
    }
  }

  if ((input.emotional_intensity ?? 0) >= 0.45) {
    tags.push({ domain: "emotional", score: scores.emotional ?? 0.25, source: "emotion" });
  }

  const seen = new Set<LifeDomain>();
  return tags
    .filter((t) => { if (seen.has(t.domain)) return false; seen.add(t.domain); return t.score >= 0.35; })
    .sort((a, b) => b.score - a.score);
}
