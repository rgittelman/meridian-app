import type { ItemCategory } from '@/services/priority/types';
import { isDevEnvironment } from '@/utils/isDev';
import { safeLower } from '@/utils/safeString';

/** Retailers, brands, and venues — never treated as people. */
const BRAND_EXCLUSIONS = new Set([
  "macy's",
  'macys',
  'macy',
  "macy's",
  "bloomingdale's",
  'bloomingdales',
  'bloomingdale',
  "bloomingdale's",
  'fine rug gallery',
  'fineruggallery',
  'the fine rug gallery',
  'rug gallery',
  'frg',
  'bcom',
  'nordstrom',
  'target',
  'walmart',
  'costco',
  'amazon',
  'whole foods',
  'trader joes',
  "kohl's",
  'kohls',
  'sephora',
  'nike',
  'apple',
  'google',
  'starbucks',
  'cvs',
  'walgreens',
  'rcs',
  'teamsnap',
  'bfsc',
]);

/** BFSC is community context — not a person or brand pill. */
const COMMUNITY_VENUE_PATTERN = /\bbfsc\b/i;

const WORK_BRAND_PATTERN =
  /\b(?:macy'?s?|bloomingdale'?s?|fine\s*rug\s*gallery|fineruggallery|rug\s*gallery|\bfrg\b|\bbcom\b)\b/i;

const BRAND_PATTERN =
  /\b(?:macy'?s?|bloomingdale'?s?|fine\s*rug|fineruggallery|rug\s*gallery|\bfrg\b|\bbcom\b|nordstrom|target|walmart|costco|amazon)\b/i;

export function isExcludedBrandName(name: string | null | undefined): boolean {
  const key = safeLower(name).replace(/[''´`]/g, "'");
  if (!key) return false;
  if (BRAND_EXCLUSIONS.has(key)) return true;
  if (BRAND_PATTERN.test(key)) return true;
  return false;
}

export function textIncludesExcludedBrand(text: string): boolean {
  return BRAND_PATTERN.test(text) || COMMUNITY_VENUE_PATTERN.test(text);
}

export type BrandDomainBoost = {
  category: ItemCategory;
  amount: number;
  source: string;
};

/** Boost Work/Community category scoring from brand/venue mentions in capture text. */
export function brandDomainBoosts(text: string): BrandDomainBoost[] {
  const lower = safeLower(text);
  const boosts: BrandDomainBoost[] = [];

  if (WORK_BRAND_PATTERN.test(lower)) {
    boosts.push({ category: 'work', amount: 3, source: 'retail_brand' });
  }
  if (COMMUNITY_VENUE_PATTERN.test(lower)) {
    boosts.push({ category: 'personal', amount: 2, source: 'bfsc_venue' });
  }

  return boosts;
}

export function logBrandExclusionMatch(
  token: string,
  context: 'people' | 'pill',
): void {
  if (!isDevEnvironment()) return;
  console.log(`[Meridian:brand] excluded ${context} token="${token}"`);
}
