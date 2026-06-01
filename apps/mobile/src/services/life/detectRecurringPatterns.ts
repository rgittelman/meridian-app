import type { Confidence } from '@/types/capture';
import type { LifeCommitment, RecurringPattern } from '@/types/life';
import { safeLower, safeTrim } from '@/utils/safeString';

function normalizeTitle(title: string): string {
  return safeTrim(title)
    .toLowerCase()
    .replace(/\d{1,2}:\d{2}/g, '')
    .replace(/\b(mon|tue|wed|thu|fri|sat|sun)\w*\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const CADENCE_HINTS: Array<{ match: RegExp; hint: string }> = [
  { match: /hockey|practice|game/i, hint: 'Weekly rhythm' },
  { match: /soccer|swim|cheer/i, hint: 'Recurring season' },
  { match: /board|bfsc/i, hint: 'Recurring meeting' },
  { match: /school|pta|classroom/i, hint: 'School cadence' },
  { match: /review|standup|sync|budget/i, hint: 'Recurring work rhythm' },
];

function cadenceHintFor(title: string): string {
  for (const { match, hint } of CADENCE_HINTS) {
    if (match.test(title)) return hint;
  }
  return 'Repeating commitment';
}

/**
 * Detects recurring patterns from events and routine captures — enrichment only.
 */
export function detectRecurringPatterns(
  commitments: LifeCommitment[],
): RecurringPattern[] {
  const buckets = new Map<
    string,
    { domainId: RecurringPattern['domainId']; label: string; person: string | null; count: number }
  >();

  for (const c of commitments) {
    if (!c.isRecurring && c.kind !== 'prep') continue;

    const key = `${c.domainId}:${normalizeTitle(c.title)}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }
    buckets.set(key, {
      domainId: c.domainId,
      label: c.title,
      person: c.personAnchor,
      count: 1,
    });
  }

  // Routine captures without calendar recurrence
  for (const c of commitments) {
    if (c.kind !== 'capture' || c.isRecurring !== true) continue;
    const key = `${c.domainId}:routine:${normalizeTitle(c.title)}`;
    if (buckets.has(key)) continue;
    buckets.set(key, {
      domainId: c.domainId,
      label: c.title,
      person: c.personAnchor,
      count: 1,
    });
  }

  return Array.from(buckets.entries())
    .filter(([, v]) => v.count >= 1)
    .map(([key, v]) => ({
      id: `pattern-${key}`,
      domainId: v.domainId,
      label: v.label.length > 48 ? v.label.slice(0, 46) + '…' : v.label,
      personAnchor: v.person,
      cadenceHint: cadenceHintFor(v.label),
      confidence: (v.count >= 2 ? 'high' : 'medium') as Confidence,
    }))
    .slice(0, 12);
}

export function patternsForDomain(
  patterns: RecurringPattern[],
  domainId: RecurringPattern['domainId'],
): RecurringPattern[] {
  return patterns.filter((p) => p.domainId === domainId).slice(0, 4);
}
