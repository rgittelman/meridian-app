/**
 * Plan Intelligence V1 — focused tests for Plan Correction Pass v1 and Timing Guard fix.
 *
 * Covers:
 * - filterActivePlanCaptures: past-time expiry with grace window
 * - planAccentForDomain: capture domain accent mapping
 * - planAccentForCategory: community fix + personal fix
 * - planAccentForEventDomain: community event override
 * - vague-week guard: tests label, not item.raw (timing guard fix)
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { filterActivePlanCaptures } from './buildPlanDaySchedule';
import {
  planAccentForCategory,
  planAccentForDomain,
  planAccentForEventDomain,
} from '@/components/calendar/planEventAccent';
import { auditRawCaptureText } from '@/services/capture/captureIntelligenceAudit';
import type { PlanPromotedCapture } from '@/types/plan';
import type { AppColors } from '@/theme/colors';

// Shared reference for vague-week guard tests: 2026-06-01 (Monday).
// "Thursday" from this reference resolves to 2026-06-04 — within the 7-day plan window.
const JUNE_1_2026 = new Date(2026, 5, 1);

// ── Minimal color stub ────────────────────────────────────────────────────────

const COLORS: AppColors = {
  // Only plan accent tokens needed for these tests
  planAccentFamily: 'family',
  planAccentWork: 'work',
  planAccentCommunity: 'community',
  planAccentHealth: 'health',
  planAccentNeutral: 'neutral',
} as unknown as AppColors;

// ── Capture factory ───────────────────────────────────────────────────────────

function makeCapture(
  overrides: Partial<PlanPromotedCapture> & { plannedStartTime: Date },
): PlanPromotedCapture {
  return {
    id: 'test-id',
    sourceCaptureId: 'src-id',
    title: 'Test capture',
    originalText: 'test capture',
    plannedEndTime: null,
    inferredPeople: [],
    inferredDomain: 'family',
    timingConfidence: 'high',
    promotionReason: 'test',
    sourceType: 'capture',
    status: 'active',
    displayTime: '6:15 AM',
    timingLabel: 'tomorrow at 6:15am',
    isApproximate: false,
    placementTier: 'exact',
    personLabel: null,
    location: null,
    ...overrides,
  };
}

// Reference: 7:00 AM on some day
function makeDate(hour: number, minute = 0): Date {
  const d = new Date(2026, 5, 2); // 2026-06-02, arbitrary
  d.setHours(hour, minute, 0, 0);
  return d;
}

// ── filterActivePlanCaptures ──────────────────────────────────────────────────

describe('filterActivePlanCaptures', () => {
  describe('exact-tier captures', () => {
    it('hides an exact capture whose time has passed beyond grace window', () => {
      // Event at 6:15 AM, now is 7:00 AM — 45 min past, beyond 15-min grace
      const capture = makeCapture({ plannedStartTime: makeDate(6, 15) });
      const result = filterActivePlanCaptures([capture], makeDate(7, 0));
      assert.equal(result.length, 0, 'should be filtered out');
    });

    it('shows an exact capture before its planned time', () => {
      // Event at 6:15 AM, now is 6:00 AM — 15 min before
      const capture = makeCapture({ plannedStartTime: makeDate(6, 15) });
      const result = filterActivePlanCaptures([capture], makeDate(6, 0));
      assert.equal(result.length, 1, 'should still be visible');
    });

    it('shows an exact capture within the grace window after its time', () => {
      // Event at 6:15 AM, now is 6:25 AM — 10 min past (within 15-min grace)
      const capture = makeCapture({ plannedStartTime: makeDate(6, 15) });
      const result = filterActivePlanCaptures([capture], makeDate(6, 25));
      assert.equal(result.length, 1, 'should still be visible within grace');
    });

    it('hides exactly at the grace window boundary', () => {
      // Event at 6:15 AM, now is 6:30 AM — exactly 15 min past (grace expired)
      const capture = makeCapture({ plannedStartTime: makeDate(6, 15) });
      const result = filterActivePlanCaptures([capture], makeDate(6, 30));
      assert.equal(result.length, 0, 'grace window expired at exactly 15 min');
    });
  });

  describe('soft-day captures', () => {
    it('does not expire a soft-day capture even late in the day', () => {
      // Soft-day capture anchored at 9:00 AM default; now is 11:00 PM
      const capture = makeCapture({
        plannedStartTime: makeDate(9, 0),
        isApproximate: true,
        placementTier: 'soft_day',
        displayTime: 'Thursday · flexible',
      });
      const result = filterActivePlanCaptures([capture], makeDate(23, 0));
      assert.equal(result.length, 1, 'soft-day capture should not expire mid-day');
    });

    it('does not expire a soft-day capture at midnight-equivalent past', () => {
      // Soft-day capture for today; now is at end of day
      const capture = makeCapture({
        plannedStartTime: makeDate(9, 0),
        isApproximate: true,
        placementTier: 'soft_day',
      });
      const result = filterActivePlanCaptures([capture], makeDate(23, 59));
      assert.equal(result.length, 1, 'soft-day capture visible all day');
    });
  });

  describe('held captures', () => {
    it('never expires a held capture regardless of time', () => {
      // Held capture — event was at 6:15 AM, now is 10:00 AM
      const capture = makeCapture({
        plannedStartTime: makeDate(6, 15),
        status: 'held',
        placementTier: 'exact',
      });
      const result = filterActivePlanCaptures([capture], makeDate(10, 0));
      assert.equal(result.length, 1, 'held captures are exempt from expiry');
    });
  });

  describe('mixed list', () => {
    it('filters expired exact captures while keeping soft-day and held ones', () => {
      const now = makeDate(10, 0);
      const expired = makeCapture({
        id: 'expired',
        sourceCaptureId: 'src-expired',
        plannedStartTime: makeDate(6, 15),
        placementTier: 'exact',
      });
      const softDay = makeCapture({
        id: 'soft',
        sourceCaptureId: 'src-soft',
        plannedStartTime: makeDate(9, 0),
        isApproximate: true,
        placementTier: 'soft_day',
      });
      const held = makeCapture({
        id: 'held',
        sourceCaptureId: 'src-held',
        plannedStartTime: makeDate(7, 0),
        status: 'held',
        placementTier: 'exact',
      });
      const future = makeCapture({
        id: 'future',
        sourceCaptureId: 'src-future',
        plannedStartTime: makeDate(14, 0),
        placementTier: 'exact',
      });

      const result = filterActivePlanCaptures([expired, softDay, held, future], now);
      const ids = result.map((c) => c.id);
      assert.ok(!ids.includes('expired'), 'expired exact capture removed');
      assert.ok(ids.includes('soft'), 'soft-day retained');
      assert.ok(ids.includes('held'), 'held retained');
      assert.ok(ids.includes('future'), 'future exact retained');
      assert.equal(result.length, 3);
    });
  });
});

// ── planAccentForDomain ───────────────────────────────────────────────────────

describe('planAccentForDomain', () => {
  it('family → planAccentFamily', () => {
    assert.equal(planAccentForDomain(COLORS, 'family'), 'family');
  });

  it('work → planAccentWork', () => {
    assert.equal(planAccentForDomain(COLORS, 'work'), 'work');
  });

  it('community → planAccentCommunity', () => {
    assert.equal(planAccentForDomain(COLORS, 'community'), 'community');
  });

  it('health → planAccentHealth', () => {
    assert.equal(planAccentForDomain(COLORS, 'health'), 'health');
  });

  it('personal → planAccentNeutral', () => {
    assert.equal(planAccentForDomain(COLORS, 'personal'), 'neutral');
  });
});

// ── planAccentForCategory ─────────────────────────────────────────────────────

describe('planAccentForCategory (calendar events)', () => {
  it('family category → family accent', () => {
    assert.equal(planAccentForCategory(COLORS, 'family', null), 'family');
  });

  it('household category → family accent', () => {
    assert.equal(planAccentForCategory(COLORS, 'household', null), 'family');
  });

  it('work category → work accent', () => {
    assert.equal(planAccentForCategory(COLORS, 'work', null), 'work');
  });

  it('financial category → work accent', () => {
    assert.equal(planAccentForCategory(COLORS, 'financial', null), 'work');
  });

  it('health category → health accent', () => {
    assert.equal(planAccentForCategory(COLORS, 'health', null), 'health');
  });

  it('personal category + no ownerLabel → neutral (not community)', () => {
    assert.equal(planAccentForCategory(COLORS, 'personal', null), 'neutral');
  });

  it('personal category + ownerLabel "You" → neutral (not community)', () => {
    // Regression: previously mapped personal+"You" to community incorrectly
    assert.equal(planAccentForCategory(COLORS, 'personal', 'You'), 'neutral');
  });

  it('personal category + ownerLabel "Work" → work accent', () => {
    assert.equal(planAccentForCategory(COLORS, 'personal', 'Work'), 'work');
  });

  it('null category + named-person ownerLabel → family accent', () => {
    // e.g. "Grace" as ownerLabel — household member means family
    assert.equal(planAccentForCategory(COLORS, null, 'Grace'), 'family');
  });

  it('null category + ownerLabel "Work" → work accent', () => {
    assert.equal(planAccentForCategory(COLORS, null, 'Work'), 'work');
  });

  it('null category + null ownerLabel → neutral', () => {
    assert.equal(planAccentForCategory(COLORS, null, null), 'neutral');
  });
});

// ── planAccentForEventDomain ──────────────────────────────────────────────────

describe('planAccentForEventDomain (community override for calendar events)', () => {
  it('BFSC board meeting (inferredDomain=community) → community accent', () => {
    // Previously fell through to neutral — this is the core regression fix
    assert.equal(
      planAccentForEventDomain(COLORS, 'community', null, null),
      'community',
    );
  });

  it('community domain overrides any category', () => {
    assert.equal(
      planAccentForEventDomain(COLORS, 'community', 'personal', null),
      'community',
    );
  });

  it('work board meeting (inferredDomain=work) → delegates to planAccentForCategory', () => {
    assert.equal(
      planAccentForEventDomain(COLORS, 'work', 'work', null),
      'work',
    );
  });

  it('null domain → delegates to planAccentForCategory', () => {
    assert.equal(
      planAccentForEventDomain(COLORS, null, 'family', null),
      'family',
    );
  });

  it('null domain + null category → neutral', () => {
    assert.equal(
      planAccentForEventDomain(COLORS, null, null, null),
      'neutral',
    );
  });
});

// ── Vague-week guard fix ──────────────────────────────────────────────────────
//
// The guard must test the resolved timing LABEL, not item.raw.
// Before the fix, any raw text containing "this week" or "next week" was rejected
// even when extractTiming had resolved a concrete day ("Thursday", "tomorrow", etc.).

describe('vague-week guard — tests label, not raw text', () => {
  it('promotes when raw contains "this week" but label resolves to "Thursday"', () => {
    // Observed regression: "Due Thursday 6/4" rejected because "this week" appears
    // earlier in the same raw capture.
    const audit = auditRawCaptureText(
      'Work on repricing Kaleen Luxe with the 7% tariff costs this week. Due Thursday 6/4',
      JUNE_1_2026,
    );
    assert.equal(
      audit.promotionEligible,
      true,
      `Expected eligible but got rejectionReason="${audit.promotionRejectionReason}"`,
    );
    assert.notEqual(audit.promotionRejectionReason, 'vague_timing');
    // Resolved to Thursday — confirmed in scope for the plan window
    assert.equal(audit.timingLabel, 'Thursday');
  });

  it('still rejects "Maybe work on this next week" — label is "next week"', () => {
    const audit = auditRawCaptureText('Maybe work on this next week', JUNE_1_2026);
    assert.equal(audit.promotionEligible, false);
    assert.equal(audit.promotionRejectionReason, 'vague_timing');
  });

  it('promotes "Planning for next month but need to call tomorrow" — label resolves to "tomorrow"', () => {
    // extractTiming finds "tomorrow" (high confidence, index 15) before "next month"
    // (medium confidence, index 17). Label = "tomorrow". Guard must not fire.
    const audit = auditRawCaptureText(
      'Planning for next month but need to call tomorrow',
      JUNE_1_2026,
    );
    assert.equal(
      audit.promotionEligible,
      true,
      `Expected eligible but got rejectionReason="${audit.promotionRejectionReason}"`,
    );
    assert.equal(audit.timingLabel, 'tomorrow');
  });

  it('rejects a capture whose resolved label is "next week"', () => {
    // The vague-week guard must still fire when the label itself is vague.
    const audit = auditRawCaptureText('Think about the budget next week', JUNE_1_2026);
    assert.equal(audit.promotionEligible, false);
    assert.equal(audit.promotionRejectionReason, 'vague_timing');
  });

  it('promotes "Submit the proposal before Thursday" — label is "before thursday", not a vague week', () => {
    // Regression guard: "before DayName" labels must not be caught by the vague-week pattern.
    const audit = auditRawCaptureText(
      'Submit the proposal before Thursday',
      JUNE_1_2026,
    );
    assert.equal(
      audit.promotionEligible,
      true,
      `Expected eligible but got rejectionReason="${audit.promotionRejectionReason}"`,
    );
    assert.notEqual(audit.promotionRejectionReason, 'vague_timing');
  });

  it('promotes "Grace volleyball tournament Saturday 9am" — no vague language in label', () => {
    const audit = auditRawCaptureText('Grace volleyball tournament Saturday 9am', JUNE_1_2026);
    assert.equal(audit.promotionEligible, true);
    assert.notEqual(audit.promotionRejectionReason, 'vague_timing');
  });

  it('rejects "Think about the mortgage options Monday" — vague framing blocks financial+day path', () => {
    // "mortgage" would match FINANCIAL_COMMITMENT_SIGNALS and "Monday" gives exactDayDetected,
    // but "think about" is in VAGUE_ONLY_PATTERN — the guard inside the financial deadline path
    // blocks promotion. Final reason is vague_intent (not vague_timing).
    const audit = auditRawCaptureText('Think about the mortgage options Monday', JUNE_1_2026);
    assert.equal(audit.promotionEligible, false);
    assert.equal(audit.promotionRejectionReason, 'vague_intent');
  });

  it('"Review payment due tomorrow" still promotes — not regressed', () => {
    const audit = auditRawCaptureText('Review payment due tomorrow', JUNE_1_2026);
    assert.equal(audit.promotionEligible, true);
  });
});
