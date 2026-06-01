import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  auditRawCaptureText,
  auditCaptureIntelligence,
} from './captureIntelligenceAudit';
import {
  CAPTURE_INTELLIGENCE_FIXTURES,
  CAPTURE_QA_REFERENCE,
} from './captureIntelligenceFixtures';
import { parseCapture } from '@/utils/parsing';
import { planFocusScoreBoost } from '@/services/plan/planFocusBoost';
import type { LifeObject } from '@/types/capture';

function includes(haystack: string | null | undefined, needle: string | undefined): boolean {
  if (!needle) return true;
  if (!haystack) return false;
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

describe('capture intelligence QA fixtures', () => {
  for (const fixture of CAPTURE_INTELLIGENCE_FIXTURES) {
    it(`${fixture.group}: ${fixture.id}`, () => {
      const audit = auditRawCaptureText(fixture.raw, CAPTURE_QA_REFERENCE, fixture.id);
      const { expect: exp } = fixture;

      assert.equal(audit.savedInCapture, true, 'savedInCapture');
      assert.equal(audit.createsCalendarEvent, false, 'no Google calendar event');
      assert.equal(audit.inferredDomain, exp.inferredDomain, 'inferredDomain');
      assert.equal(audit.promotionEligible, exp.promotionEligible, 'promotionEligible');
      assert.equal(audit.propagatedToPlan, exp.propagatedToPlan, 'propagatedToPlan');
      assert.equal(audit.propagatedToLife, exp.propagatedToLife, 'propagatedToLife');

      if (exp.rejectionReason !== undefined) {
        assert.equal(audit.promotionRejectionReason, exp.rejectionReason, 'rejectionReason');
      }

      assert.ok(
        includes(audit.planTitle, exp.planTitleIncludes),
        `planTitle "${audit.planTitle}" includes "${exp.planTitleIncludes}"`,
      );
      assert.ok(
        includes(audit.parsedLocation, exp.parsedLocationIncludes),
        `parsedLocation "${audit.parsedLocation}" includes "${exp.parsedLocationIncludes}"`,
      );
      assert.ok(
        includes(audit.parsedTime, exp.parsedTimeIncludes),
        `parsedTime "${audit.parsedTime}" includes "${exp.parsedTimeIncludes}"`,
      );

      if (exp.inferredPeople) {
        for (const person of exp.inferredPeople) {
          assert.ok(
            audit.inferredPeople.some((p) => p.toLowerCase() === person.toLowerCase()),
            `inferredPeople includes ${person}`,
          );
        }
      }
    });
  }

  it('Ryan promotion set — promotedBecause and schedule signals', () => {
    const cases: Array<{
      id: string;
      raw: string;
      promotedBecause: string;
    }> = [
      {
        id: 'work-macys-summit',
        raw: "Macy's Home Leadership Summit Next Thursday in Long Island City ny at 10am",
        promotedBecause: 'exact_day_exact_clock',
      },
      {
        id: 'money-payment-due',
        raw: 'Review payment due tomorrow',
        promotedBecause: 'high_confidence_day_only',
      },
      {
        id: 'health-medication-friday',
        raw: 'Take medication refill Friday',
        promotedBecause: 'health_self_management',
      },
    ];

    for (const { id, raw, promotedBecause } of cases) {
      const audit = auditRawCaptureText(raw, CAPTURE_QA_REFERENCE, id);
      assert.equal(audit.promotionEligible, true, id);
      assert.equal(audit.promotedBecause, promotedBecause, `${id} promotedBecause`);
      assert.equal(audit.meaningfulDomainSignal, true, `${id} meaningfulDomainSignal`);
    }
  });

  it('minute-precision clocks are exact (no tilde)', () => {
    const audit = auditRawCaptureText(
      'Pick up Grace Friday at 5:15',
      CAPTURE_QA_REFERENCE,
      'family-grace-pickup',
    );
    assert.ok(audit.parsedTime?.includes('5:15 PM'));
    assert.ok(!audit.parsedTime?.startsWith('~'), 'no approximate tilde');
  });

  it('Macy’s summit — exact Work / Plan / Life contract', () => {
    const audit = auditRawCaptureText(
      "Macy's Home Leadership Summit Next Thursday in Long Island City ny at 10am",
      CAPTURE_QA_REFERENCE,
      'work-macys-summit',
    );

    assert.equal(audit.inferredDomain, 'work');
    assert.equal(audit.promotionEligible, true);
    assert.equal(audit.propagatedToPlan, true);
    assert.equal(audit.propagatedToLife, true);
    assert.ok(audit.planTitle.includes("Macy's Home Leadership Summit"));
    assert.ok(audit.parsedLocation?.includes('Long Island City'));
    assert.ok(audit.parsedTime?.includes('10:00'));
    assert.equal(audit.promotionRejectionReason, null);
  });

  it('Focus boost applies within 48h of promoted start', () => {
    const parse = parseCapture('Pick up Grace Friday at 5:15');
    const item: LifeObject = {
      id: 'focus-test',
      raw: 'Pick up Grace Friday at 5:15',
      title: 'Pick up Grace Friday at 5:15',
      objectType: 'task',
      createdAt: new Date(),
      status: 'captured',
      parse,
      momentumValue: 0.5,
      recurrence: null,
    };
    const ref = new Date(CAPTURE_QA_REFERENCE);
    const daysUntilFriday = (5 - ref.getDay() + 7) % 7 || 7;
    const fridayAfternoon = new Date(ref);
    fridayAfternoon.setDate(fridayAfternoon.getDate() + daysUntilFriday);
    fridayAfternoon.setHours(16, 0, 0, 0);
    const boost = planFocusScoreBoost(item, 'active', fridayAfternoon);
    assert.ok(boost > 0, 'planFocusScoreBoost within 48h');
    const audit = auditCaptureIntelligence(item, fridayAfternoon);
    assert.equal(audit.propagatedToFocus, true);
  });
});
