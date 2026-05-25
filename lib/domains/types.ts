/**
 * lib/domains/types.ts — Cross-domain life OS types.
 */

export const LIFE_DOMAINS = [
  "life",
  "health",
  "money",
  "productivity",
  "relationships",
  "emotional",
  "routines",
  "goals",
] as const;

export type LifeDomain = (typeof LIFE_DOMAINS)[number];

/** Domain scores keyed by domain — values 0–1, sorted for tagging. */
export type DomainScores = Partial<Record<LifeDomain, number>>;

export interface DomainTag {
  domain:     LifeDomain;
  score:      number;
  source:     "category" | "keyword" | "emotion";
}

/** Maps app routes to primary retrieval domain. */
export const ROUTE_DOMAIN_MAP: Record<string, LifeDomain> = {
  health: "health",
  money:  "money",
  life:   "life",
};
