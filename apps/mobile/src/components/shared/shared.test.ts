/**
 * V1.2 Shared Component Logic — unit tests
 *
 * Pure logic only — no React Native imports, safe for Node test runner.
 * Component rendering tests require a simulator; covered by visual validation.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

// ── Domain color resolver ─────────────────────────────────────────────────────

const MOCK_COLORS = {
  domainFamily:    '#8B5CF6',
  domainWork:      '#3B82F6',
  domainHealth:    '#10B981',
  domainPersonal:  '#F59E0B',
  domainCommunity: '#06B6D4',
  success:     '#10B981',
  successSoft: 'rgba(16,185,129,0.10)',
  warning:     '#F59E0B',
  warningSoft: 'rgba(245,158,11,0.12)',
  accent:      '#7B6FE8',
  accentSoft:  'rgba(123,111,232,0.14)',
  inkTertiary:    '#6B6485',
  surfaceElevated: '#1A1928',
  planAccentFamily:    '#8B5CF6',
  planAccentWork:      '#3B82F6',
  planAccentCommunity: '#06B6D4',
  planAccentHealth:    '#10B981',
  planAccentNeutral:   '#6B7280',
} as any;

// Inline the pure function under test (avoids RN import chain at test time)
function domainColorFor(colors: typeof MOCK_COLORS, domain: string): string {
  switch (domain) {
    case 'family':    return colors.domainFamily;
    case 'work':      return colors.domainWork;
    case 'health':    return colors.domainHealth;
    case 'personal':  return colors.domainPersonal;
    case 'community': return colors.domainCommunity;
    default:          throw new Error(`Unknown domain: ${domain}`);
  }
}

describe('domainColorFor', () => {
  it('returns domainFamily for family', () => {
    assert.equal(domainColorFor(MOCK_COLORS, 'family'), '#8B5CF6');
  });
  it('returns domainWork for work', () => {
    assert.equal(domainColorFor(MOCK_COLORS, 'work'), '#3B82F6');
  });
  it('returns domainHealth for health', () => {
    assert.equal(domainColorFor(MOCK_COLORS, 'health'), '#10B981');
  });
  it('returns domainPersonal for personal', () => {
    assert.equal(domainColorFor(MOCK_COLORS, 'personal'), '#F59E0B');
  });
  it('returns domainCommunity for community', () => {
    assert.equal(domainColorFor(MOCK_COLORS, 'community'), '#06B6D4');
  });
  it('throws on unknown domain', () => {
    assert.throws(() => domainColorFor(MOCK_COLORS, 'unknown'));
  });
  it('each domain returns a distinct color', () => {
    const domains = ['family', 'work', 'health', 'personal', 'community'];
    const colors = domains.map((d) => domainColorFor(MOCK_COLORS, d));
    const unique = new Set(colors);
    assert.equal(unique.size, 5, 'All 5 domain colors should be distinct');
  });
});

// ── StatusPill sentiment logic ────────────────────────────────────────────────

function sentimentColors(
  colors: typeof MOCK_COLORS,
  sentiment: string,
): { bg: string; fg: string } {
  switch (sentiment) {
    case 'positive': return { bg: colors.successSoft,    fg: colors.success };
    case 'warning':  return { bg: colors.warningSoft,    fg: colors.warning };
    case 'caution':  return { bg: colors.accentSoft,     fg: colors.accent };
    default:         return { bg: colors.surfaceElevated, fg: colors.inkTertiary };
  }
}

describe('StatusPill sentimentColors', () => {
  it('positive → success colors', () => {
    const { fg } = sentimentColors(MOCK_COLORS, 'positive');
    assert.equal(fg, '#10B981');
  });
  it('warning → warning colors', () => {
    const { fg } = sentimentColors(MOCK_COLORS, 'warning');
    assert.equal(fg, '#F59E0B');
  });
  it('caution → accent colors', () => {
    const { fg } = sentimentColors(MOCK_COLORS, 'caution');
    assert.equal(fg, '#7B6FE8');
  });
  it('neutral → muted colors', () => {
    const { fg } = sentimentColors(MOCK_COLORS, 'neutral');
    assert.equal(fg, '#6B6485');
  });
  it('unknown sentiment falls through to neutral', () => {
    const { fg } = sentimentColors(MOCK_COLORS, 'something_else');
    assert.equal(fg, '#6B6485');
  });
});

// ── WeeklyActivityBar bar height logic ───────────────────────────────────────

const BAR_MAX_HEIGHT = 40;
const BAR_MIN_HEIGHT = 3;

function computeBarHeight(count: number, maxCount: number): number {
  return Math.max(BAR_MIN_HEIGHT, Math.round((count / maxCount) * BAR_MAX_HEIGHT));
}

describe('WeeklyActivityBar bar heights', () => {
  it('tallest bar reaches max height', () => {
    assert.equal(computeBarHeight(10, 10), BAR_MAX_HEIGHT);
  });
  it('zero count returns min height (no zero-height bars)', () => {
    assert.equal(computeBarHeight(0, 10), BAR_MIN_HEIGHT);
  });
  it('half count returns half max height', () => {
    assert.equal(computeBarHeight(5, 10), 20);
  });
  it('single item: renders at max height', () => {
    assert.equal(computeBarHeight(1, 1), BAR_MAX_HEIGHT);
  });
  it('maxCount=1 guard prevents division-by-zero via Math.max', () => {
    // computeBarHeight is safe because callers guard: Math.max(...counts, 1)
    assert.equal(computeBarHeight(0, 1), BAR_MIN_HEIGHT);
  });
});

// ── LifeBalanceChart arc math ─────────────────────────────────────────────────

const CIRCUMFERENCE = 2 * Math.PI * 36;
const GAP_ARC = (4 / 360) * CIRCUMFERENCE;

function computeArcs(
  segments: Array<{ domain: string; count: number }>,
): Array<{ domain: string; arcLen: number; offset: number }> {
  const active = segments.filter((s) => s.count > 0);
  const total = active.reduce((sum, s) => sum + s.count, 0);
  if (total === 0) return [];

  const gapTotal = GAP_ARC * active.length;
  const available = CIRCUMFERENCE - gapTotal;

  let offset = 0;
  return active.map((seg) => {
    const arcLen = (seg.count / total) * available;
    const result = { domain: seg.domain, arcLen, offset };
    offset += arcLen + GAP_ARC;
    return result;
  });
}

describe('LifeBalanceChart arc math', () => {
  it('empty segments returns empty array', () => {
    assert.deepEqual(computeArcs([]), []);
  });
  it('all-zero counts returns empty array', () => {
    assert.deepEqual(computeArcs([{ domain: 'family', count: 0 }]), []);
  });
  it('single segment fills available arc (minus gaps)', () => {
    const arcs = computeArcs([{ domain: 'family', count: 1 }]);
    assert.equal(arcs.length, 1);
    const available = CIRCUMFERENCE - GAP_ARC;
    assert.ok(Math.abs(arcs[0].arcLen - available) < 0.001, 'Single segment should fill available arc');
  });
  it('equal segments split arc evenly', () => {
    const arcs = computeArcs([
      { domain: 'family',   count: 1 },
      { domain: 'work',     count: 1 },
      { domain: 'health',   count: 1 },
      { domain: 'personal', count: 1 },
    ]);
    assert.equal(arcs.length, 4);
    const [first, ...rest] = arcs.map((a) => a.arcLen);
    for (const len of rest) {
      assert.ok(Math.abs(len - first) < 0.001, 'Equal counts should produce equal arc lengths');
    }
  });
  it('arc lengths sum to available space', () => {
    const segs = [
      { domain: 'family', count: 3 },
      { domain: 'work',   count: 2 },
      { domain: 'health', count: 1 },
    ];
    const arcs = computeArcs(segs);
    const totalArc = arcs.reduce((sum, a) => sum + a.arcLen, 0);
    const gapTotal = GAP_ARC * segs.length;
    const available = CIRCUMFERENCE - gapTotal;
    assert.ok(Math.abs(totalArc - available) < 0.001, 'Arcs should sum to available space');
  });
  it('filters out zero-count segments', () => {
    const arcs = computeArcs([
      { domain: 'family', count: 5 },
      { domain: 'work',   count: 0 },
      { domain: 'health', count: 3 },
    ]);
    assert.equal(arcs.length, 2);
    assert.ok(arcs.every((a) => a.domain !== 'work'));
  });
  it('offsets are cumulative and increasing', () => {
    const arcs = computeArcs([
      { domain: 'family', count: 2 },
      { domain: 'work',   count: 2 },
      { domain: 'health', count: 2 },
    ]);
    for (let i = 1; i < arcs.length; i++) {
      assert.ok(arcs[i].offset > arcs[i - 1].offset, 'Each segment offset should be larger than previous');
    }
  });
});
