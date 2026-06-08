import type { Confidence } from '@/types/capture';
import { safeLower } from '@/utils/safeString';

export type ChildSportsProfile = {
  name: string;
  personId: string;
  activities: string[];
  /** TeamSnap / league title tokens that imply this child */
  leagueTokens: string[];
};

/** Known child sports context for household relevance + display. */
export const CHILD_SPORTS_PROFILES: ChildSportsProfile[] = [
  {
    name: 'Grace',
    personId: 'grace',
    activities: ['volleyball', 'soccer', 'school'],
    leagueTokens: ['grace'],
  },
  {
    name: 'Reagan',
    personId: 'reagan',
    activities: ['cheer', 'volleyball', 'school'],
    leagueTokens: ['reagan'],
  },
  {
    name: 'Quinn',
    personId: 'quinn',
    activities: ['hockey', 'football', 'school'],
    leagueTokens: ['beaver', 'rangers/beaver', 'rangers beaver'],
  },
  {
    name: 'Hudson',
    personId: 'hudson',
    activities: ['hockey', 'football', 'school'],
    leagueTokens: ['penguin', 'rangers/penguin', 'rangers penguin'],
  },
];

export type InferredSportsChild = {
  name: string;
  personId: string;
  confidence: Confidence;
  reason: string;
};

export function inferChildFromSportsTitle(
  title: string,
  location?: string,
): InferredSportsChild | null {
  const text = [title, location ?? ''].join(' ').toLowerCase();

  for (const child of CHILD_SPORTS_PROFILES) {
    if (new RegExp(`\\b${child.name}\\b`, 'i').test(text)) {
      return {
        name: child.name,
        personId: child.personId,
        confidence: 'high',
        reason: 'child_name_in_text',
      };
    }
  }

  if (/rangers\s*\/\s*beaver|beaver\s+division/i.test(text)) {
    return {
      name: 'Quinn',
      personId: 'quinn',
      confidence: 'high',
      reason: 'teamsnap_beaver_division',
    };
  }
  if (/rangers\s*\/\s*penguin|penguin\s+division/i.test(text)) {
    return {
      name: 'Hudson',
      personId: 'hudson',
      confidence: 'high',
      reason: 'teamsnap_penguin_division',
    };
  }

  if (/\bbeaver\b/i.test(text) && /rangers|division|hockey|teamsnap/i.test(text)) {
    return {
      name: 'Quinn',
      personId: 'quinn',
      confidence: 'medium',
      reason: 'beaver_league_token',
    };
  }
  if (/\bpenguin\b/i.test(text) && /rangers|division|hockey|teamsnap/i.test(text)) {
    return {
      name: 'Hudson',
      personId: 'hudson',
      confidence: 'medium',
      reason: 'penguin_league_token',
    };
  }

  return null;
}

export function childProfileByPersonId(personId: string): ChildSportsProfile | undefined {
  return CHILD_SPORTS_PROFILES.find((c) => c.personId === safeLower(personId));
}
