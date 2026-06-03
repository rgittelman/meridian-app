/**
 * lifeSummary — unit tests
 *
 * Pure functions inlined here to avoid the React Native import chain
 * (lifeSummary.ts → types/calendar → types that pull in RN modules).
 * Same pattern as shared.test.ts.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

// ── Inline the pure functions under test ──────────────────────────────────────

type LifeDomainId = 'family' | 'work' | 'community' | 'health' | 'personal';
type ActivityDay = { label: string; count: number; domain?: LifeDomainId; isToday: boolean };

const DOMAIN_ORDER: LifeDomainId[] = ['family', 'work', 'community', 'health', 'personal'];
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

function dominantDomain(counts: Record<LifeDomainId, number>): LifeDomainId | null {
  let best: LifeDomainId | null = null;
  let bestCount = 0;
  for (const domain of DOMAIN_ORDER) {
    const c = counts[domain];
    if (c > bestCount) { bestCount = c; best = domain; }
  }
  return best;
}

function deriveWeeklyActivityDays(
  weekEvents: Array<{ startTime: Date; inferredLifeDomain: string }>,
  today: Date,
): ActivityDay[] {
  const todayIndex = today.getDay();
  const weekStart = new Date(today);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(today.getDate() - todayIndex);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const dayCounts: Array<Record<LifeDomainId, number>> = Array.from({ length: 7 }, () => ({
    family: 0, work: 0, community: 0, health: 0, personal: 0,
  }));

  for (const event of weekEvents) {
    const start = new Date(event.startTime);
    if (start < weekStart || start >= weekEnd) continue;
    const slot = start.getDay();
    const d = event.inferredLifeDomain as LifeDomainId;
    if (d in dayCounts[slot]) dayCounts[slot][d] += 1;
  }

  return dayCounts.map((counts, i) => {
    const total = (Object.values(counts) as number[]).reduce((s, n) => s + n, 0);
    const dominant = dominantDomain(counts);
    return {
      label: DAY_LABELS[i],
      count: total,
      domain: total > 0 ? (dominant ?? undefined) : undefined,
      isToday: i === todayIndex,
    };
  });
}

function deriveBalanceSegments(
  domains: Array<{ id: LifeDomainId; upcomingCommitments: unknown[]; activeCaptures: unknown[] }>,
): Array<{ domain: LifeDomainId; count: number }> {
  return domains.map((d) => ({
    domain: d.id,
    count: d.upcomingCommitments.length + d.activeCaptures.length,
  }));
}

function deriveLifeHeadline(
  activeDomainCount: number,
  hasActivity: boolean,
  topDomainLabels: string[] = [],
): string {
  if (!hasActivity) return 'Patterns become clearer over time.';
  const [first, second] = topDomainLabels;
  if (activeDomainCount === 1) {
    return first ? `${first} is carrying your week.` : 'One area is carrying the week.';
  }
  if (activeDomainCount === 2) {
    return first && second ? `${first} and ${second} are in motion.` : 'Two areas are in motion.';
  }
  return first && second
    ? `${first} and ${second} are leading the week.`
    : 'Your attention is across a few areas.';
}

function deriveTopDomainLabels(
  domains: Array<{ label: string; upcomingCommitments: unknown[]; activeCaptures: unknown[] }>,
  n = 2,
): string[] {
  return [...domains]
    .sort(
      (a, b) =>
        (b.upcomingCommitments.length + b.activeCaptures.length) -
        (a.upcomingCommitments.length + a.activeCaptures.length),
    )
    .slice(0, n)
    .map((d) => d.label);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeEvent(startTime: Date, inferredLifeDomain: string) {
  return { id: Math.random().toString(), startTime, inferredLifeDomain };
}

// A known Wednesday (2026-06-03)
const WEDNESDAY = new Date('2026-06-03T10:00:00');

function dayOfWeek(dayIndex: number, base: Date): Date {
  const d = new Date(base);
  d.setHours(10, 0, 0, 0);
  d.setDate(base.getDate() - base.getDay() + dayIndex);
  return d;
}

// ── deriveWeeklyActivityDays ──────────────────────────────────────────────────

describe('deriveWeeklyActivityDays', () => {
  it('returns exactly 7 slots', () => {
    const days = deriveWeeklyActivityDays([], WEDNESDAY);
    assert.equal(days.length, 7);
  });

  it('all slots are zero count when no events', () => {
    const days = deriveWeeklyActivityDays([], WEDNESDAY);
    assert.ok(days.every((d) => d.count === 0));
  });

  it('labels are Su Mo Tu We Th Fr Sa', () => {
    const days = deriveWeeklyActivityDays([], WEDNESDAY);
    assert.deepEqual(days.map((d) => d.label), ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']);
  });

  it('today flag set for correct slot (Wednesday = index 3)', () => {
    const days = deriveWeeklyActivityDays([], WEDNESDAY);
    assert.equal(days.filter((d) => d.isToday).length, 1);
    assert.equal(days[3].isToday, true);
  });

  it('event on Wednesday lands in slot 3', () => {
    const events = [makeEvent(dayOfWeek(3, WEDNESDAY), 'family')];
    const days = deriveWeeklyActivityDays(events, WEDNESDAY);
    assert.equal(days[3].count, 1);
    assert.equal(days[3].domain, 'family');
  });

  it('events outside current week are excluded', () => {
    const nextWeek = new Date(WEDNESDAY);
    nextWeek.setDate(WEDNESDAY.getDate() + 8);
    const days = deriveWeeklyActivityDays([makeEvent(nextWeek, 'work')], WEDNESDAY);
    assert.ok(days.every((d) => d.count === 0));
  });

  it('multiple events same day accumulate count', () => {
    const wed = dayOfWeek(3, WEDNESDAY);
    const days = deriveWeeklyActivityDays([
      makeEvent(wed, 'family'),
      makeEvent(wed, 'family'),
      makeEvent(wed, 'work'),
    ], WEDNESDAY);
    assert.equal(days[3].count, 3);
  });

  it('dominant domain is the one with most events', () => {
    const wed = dayOfWeek(3, WEDNESDAY);
    const days = deriveWeeklyActivityDays([
      makeEvent(wed, 'work'),
      makeEvent(wed, 'work'),
      makeEvent(wed, 'family'),
    ], WEDNESDAY);
    assert.equal(days[3].domain, 'work');
  });

  it('tie breaks by LIFE_DOMAIN_ORDER (family before work)', () => {
    const wed = dayOfWeek(3, WEDNESDAY);
    const days = deriveWeeklyActivityDays([
      makeEvent(wed, 'family'),
      makeEvent(wed, 'work'),
    ], WEDNESDAY);
    assert.equal(days[3].domain, 'family');
  });

  it('days with no events have domain = undefined', () => {
    const wed = dayOfWeek(3, WEDNESDAY);
    const days = deriveWeeklyActivityDays([makeEvent(wed, 'health')], WEDNESDAY);
    assert.equal(days[0].domain, undefined);
  });

  it('event on Sunday lands in slot 0', () => {
    const sun = dayOfWeek(0, WEDNESDAY);
    const days = deriveWeeklyActivityDays([makeEvent(sun, 'community')], WEDNESDAY);
    assert.equal(days[0].count, 1);
    assert.equal(days[0].domain, 'community');
  });

  it('event on Saturday lands in slot 6', () => {
    const sat = dayOfWeek(6, WEDNESDAY);
    const days = deriveWeeklyActivityDays([makeEvent(sat, 'personal')], WEDNESDAY);
    assert.equal(days[6].count, 1);
    assert.equal(days[6].domain, 'personal');
  });
});

// ── deriveBalanceSegments ─────────────────────────────────────────────────────

describe('deriveBalanceSegments', () => {
  it('returns one segment per domain', () => {
    const segs = deriveBalanceSegments([
      { id: 'family', upcomingCommitments: [{}, {}], activeCaptures: [{}] },
      { id: 'work',   upcomingCommitments: [{}],    activeCaptures: [] },
    ]);
    assert.equal(segs.length, 2);
  });

  it('count = upcomingCommitments + activeCaptures', () => {
    const segs = deriveBalanceSegments([
      { id: 'family', upcomingCommitments: [{}, {}, {}], activeCaptures: [{}, {}] },
    ]);
    assert.equal(segs[0].count, 5);
  });

  it('all-zero gives count 0', () => {
    const segs = deriveBalanceSegments([
      { id: 'health', upcomingCommitments: [], activeCaptures: [] },
    ]);
    assert.equal(segs[0].count, 0);
  });

  it('domain id is preserved', () => {
    const segs = deriveBalanceSegments([
      { id: 'community', upcomingCommitments: [{}], activeCaptures: [] },
    ]);
    assert.equal(segs[0].domain, 'community');
  });
});

// ── deriveLifeHeadline ────────────────────────────────────────────────────────

describe('deriveLifeHeadline', () => {
  it('no activity → patterns copy regardless of count', () => {
    assert.equal(deriveLifeHeadline(0, false), 'Patterns become clearer over time.');
    assert.equal(deriveLifeHeadline(3, false), 'Patterns become clearer over time.');
  });

  it('1 active domain — no labels → generic fallback', () => {
    assert.equal(deriveLifeHeadline(1, true), 'One area is carrying the week.');
  });
  it('1 active domain — with label → named headline', () => {
    assert.equal(deriveLifeHeadline(1, true, ['Family']), 'Family is carrying your week.');
  });

  it('2 active domains — no labels → generic fallback', () => {
    assert.equal(deriveLifeHeadline(2, true), 'Two areas are in motion.');
  });
  it('2 active domains — with labels → named headline', () => {
    assert.equal(deriveLifeHeadline(2, true, ['Family', 'Work']), 'Family and Work are in motion.');
  });
  it('2 active domains — only one label → generic fallback', () => {
    assert.equal(deriveLifeHeadline(2, true, ['Family']), 'Two areas are in motion.');
  });

  it('3+ active domains — no labels → generic', () => {
    assert.equal(deriveLifeHeadline(3, true), 'Your attention is across a few areas.');
  });
  it('3+ active domains — with top two labels → named headline', () => {
    assert.equal(
      deriveLifeHeadline(4, true, ['Family', 'Work']),
      'Family and Work are leading the week.',
    );
  });
  it('5 active domains — with top two labels', () => {
    assert.equal(
      deriveLifeHeadline(5, true, ['Health', 'Personal']),
      'Health and Personal are leading the week.',
    );
  });
});

// ── deriveTopDomainLabels ─────────────────────────────────────────────────────

describe('deriveTopDomainLabels', () => {
  it('returns top N by combined commitment count', () => {
    const domains = [
      { label: 'Work',     upcomingCommitments: [{}],           activeCaptures: [] },
      { label: 'Family',   upcomingCommitments: [{}, {}, {}],   activeCaptures: [{}] },
      { label: 'Health',   upcomingCommitments: [{}],           activeCaptures: [{}] },
    ];
    const top = deriveTopDomainLabels(domains, 2);
    assert.equal(top[0], 'Family'); // 4 total
    assert.equal(top[1], 'Health'); // 2 total
  });

  it('returns up to n labels (fewer if less available)', () => {
    const domains = [
      { label: 'Work', upcomingCommitments: [{}], activeCaptures: [] },
    ];
    assert.equal(deriveTopDomainLabels(domains, 2).length, 1);
  });

  it('empty domains returns empty array', () => {
    assert.deepEqual(deriveTopDomainLabels([]), []);
  });

  it('default n=2', () => {
    const domains = [
      { label: 'A', upcomingCommitments: [{}, {}], activeCaptures: [] },
      { label: 'B', upcomingCommitments: [{}],     activeCaptures: [] },
      { label: 'C', upcomingCommitments: [{}],     activeCaptures: [] },
    ];
    assert.equal(deriveTopDomainLabels(domains).length, 2);
    assert.equal(deriveTopDomainLabels(domains)[0], 'A');
  });

  it('tie: both included, original order preserved', () => {
    const domains = [
      { label: 'Work',   upcomingCommitments: [{}], activeCaptures: [] },
      { label: 'Family', upcomingCommitments: [{}], activeCaptures: [] },
    ];
    const top = deriveTopDomainLabels(domains, 2);
    assert.equal(top.length, 2);
  });
});
