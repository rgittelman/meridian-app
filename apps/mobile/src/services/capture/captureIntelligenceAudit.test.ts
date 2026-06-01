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

  // ── Natural language hardening v1 ─────────────────────────────────────────

  it('day+time without "at" — Saturday 9am parses as Saturday at 9am', () => {
    const audit = auditRawCaptureText(
      'Grace volleyball tournament Saturday 9am',
      CAPTURE_QA_REFERENCE,
      'family-grace-volleyball',
    );
    assert.equal(audit.promotionEligible, true, 'should promote');
    assert.equal(audit.inferredDomain, 'family', 'domain=family');
    assert.equal(audit.exactDayDetected, true, 'exactDayDetected');
    assert.equal(audit.exactClockDetected, true, 'exactClockDetected (9am is exact)');
    assert.ok(audit.parsedTime?.includes('9:00 AM'), `parsedTime "${audit.parsedTime}" should include 9:00 AM`);
    assert.ok(
      audit.inferredPeople.some((p) => p.toLowerCase() === 'grace'),
      `inferredPeople ${JSON.stringify(audit.inferredPeople)} should include Grace`,
    );
    assert.equal(audit.promotionRejectionReason, null);
  });

  it('first-word child name — Hudson football registration promotes to Plan', () => {
    const audit = auditRawCaptureText(
      'Hudson football registration opens Monday',
      CAPTURE_QA_REFERENCE,
      'family-hudson-football',
    );
    assert.equal(audit.promotionEligible, true, 'should promote');
    assert.equal(audit.inferredDomain, 'family', 'domain=family');
    assert.equal(audit.exactDayDetected, true, 'exactDayDetected');
    assert.equal(audit.meaningfulDomainSignal, true, 'meaningfulDomainSignal');
    assert.ok(
      audit.inferredPeople.some((p) => p.toLowerCase() === 'hudson'),
      `inferredPeople ${JSON.stringify(audit.inferredPeople)} should include Hudson`,
    );
    assert.equal(audit.promotionRejectionReason, null);
  });

  it('"before [day]" deadline — Submit expense report before Friday promotes', () => {
    const audit = auditRawCaptureText(
      'Submit expense report before Friday',
      CAPTURE_QA_REFERENCE,
      'work-expense-report',
    );
    assert.equal(audit.promotionEligible, true, 'should promote');
    assert.equal(audit.exactDayDetected, true, 'exactDayDetected');
    assert.equal(audit.actionableIntentDetected, true, 'actionableIntentDetected');
    assert.ok(audit.parsedTime?.includes('Friday'), `parsedTime "${audit.parsedTime}" should mention Friday`);
    assert.equal(audit.promotionRejectionReason, null);
  });

  it('"by [day]" deadline — Send form by Friday promotes', () => {
    const audit = auditRawCaptureText(
      'Send form by Friday',
      CAPTURE_QA_REFERENCE,
      'work-send-form',
    );
    assert.equal(audit.promotionEligible, true, 'should promote');
    assert.equal(audit.exactDayDetected, true, 'exactDayDetected');
    assert.equal(audit.actionableIntentDetected, true, 'actionableIntentDetected');
    assert.equal(audit.promotionRejectionReason, null);
  });

  it('should NOT promote — no timing blocks Plan regardless of action/domain', () => {
    const noTimingCases = [
      { id: 'hvac', raw: 'Remember to call the HVAC company' },
      { id: 'milk', raw: 'Buy milk' },
      { id: 'dentist', raw: 'Schedule dentist appointment' },
      { id: 'pool', raw: 'Order pool chemicals for BFSC' },
    ];

    for (const { id, raw } of noTimingCases) {
      const audit = auditRawCaptureText(raw, CAPTURE_QA_REFERENCE, id);
      assert.equal(audit.promotionEligible, false, `${id}: should not promote`);
      assert.equal(audit.propagatedToPlan, false, `${id}: not on Plan`);
      assert.equal(
        audit.promotionRejectionReason,
        'no_timing',
        `${id}: rejection=no_timing`,
      );
    }
  });

  it('BFSC community signal — BFSC board meeting promotes, pool chemicals do not', () => {
    const boardMeeting = auditRawCaptureText(
      'BFSC board meeting Tuesday at 7pm',
      CAPTURE_QA_REFERENCE,
      'community-bfsc-board',
    );
    assert.equal(boardMeeting.promotionEligible, true, 'board meeting should promote');
    assert.equal(boardMeeting.inferredDomain, 'community', 'domain=community');
    assert.equal(boardMeeting.meaningfulDomainSignal, true, 'meaningfulDomainSignal');

    const poolChemicals = auditRawCaptureText(
      'Order pool chemicals for BFSC',
      CAPTURE_QA_REFERENCE,
      'no-promote-pool',
    );
    assert.equal(poolChemicals.promotionEligible, false, 'pool chemicals should not promote');
    assert.equal(poolChemicals.promotionRejectionReason, 'no_timing');
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

  // ── Fix 1: "reminder to" is a dictation prefix, not recurrence ─────────────

  it('Fix 1 — "reminder to" prefix does not set isRoutine, capture promotes normally', () => {
    const pickupAudit = auditRawCaptureText(
      'Reminder to pick up Grace Friday at 5',
      CAPTURE_QA_REFERENCE,
      'reminder-pickup',
    );
    assert.equal(pickupAudit.promotionEligible, true, 'pickup should promote');
    assert.equal(pickupAudit.propagatedToPlan, true, 'should appear on Plan');
    assert.equal(pickupAudit.promotionRejectionReason, null, 'no rejection reason');
    assert.equal(pickupAudit.inferredDomain, 'family', 'domain=family');

    const expenseAudit = auditRawCaptureText(
      'Reminder to submit expense report before Thursday',
      CAPTURE_QA_REFERENCE,
      'reminder-expense',
    );
    assert.equal(expenseAudit.promotionEligible, true, 'expense report should promote');
    assert.equal(expenseAudit.propagatedToPlan, true, 'should appear on Plan');
    assert.equal(expenseAudit.promotionRejectionReason, null, 'no rejection reason');

    // True recurrence signals must still block promotion
    const trueRecurring = auditRawCaptureText(
      'Bring Hudson skates every Monday',
      CAPTURE_QA_REFERENCE,
      'recurring-check',
    );
    assert.equal(trueRecurring.promotionEligible, false, 'every Monday is recurring');
    assert.equal(
      trueRecurring.promotionRejectionReason,
      'recurring_not_specific_instance',
      'rejected as recurring',
    );
  });

  // ── Fix 2: "started [word]" without health vocabulary is not Health ─────────

  it('Fix 2 — "started planning/working/reviewing" does not classify as Health', () => {
    const cases = [
      { id: 'started-planning', raw: 'Started planning the Q3 budget review' },
      { id: 'started-working', raw: 'I started working on the store visit deck' },
      { id: 'started-reviewing', raw: 'We started reviewing invoices this week' },
    ];
    for (const { id, raw } of cases) {
      const audit = auditRawCaptureText(raw, CAPTURE_QA_REFERENCE, id);
      assert.notEqual(audit.inferredDomain, 'health', `${id}: should not be health`);
    }

    // Medical co-signal must still trigger Health
    const medAudit = auditRawCaptureText(
      'Started new medication Friday',
      CAPTURE_QA_REFERENCE,
      'started-medication',
    );
    assert.equal(medAudit.inferredDomain, 'health', 'started medication → health');
    assert.equal(medAudit.promotionEligible, true, 'started medication + named day should promote');

    // Domain check only — "started therapy" is a note-style entry; action verb not required
    const therapyAudit = auditRawCaptureText(
      'Started physical therapy Monday',
      CAPTURE_QA_REFERENCE,
      'started-therapy',
    );
    assert.equal(therapyAudit.inferredDomain, 'health', 'started physical therapy → health');
  });

  // ── Fix 3: bare "board" does not override Work with Community ───────────────

  it('Fix 3 — work "board" contexts stay Work domain; BFSC/swim board stays Community', () => {
    const workCases = [
      {
        id: 'board-presentation',
        raw: 'Board presentation to leadership team next Wednesday at 9am',
      },
      { id: 'bloomingdales-board', raw: "Bloomingdale's board call Friday at 2pm" },
      { id: 'board-deck', raw: 'Review board deck before Monday' },
    ];
    for (const { id, raw } of workCases) {
      const audit = auditRawCaptureText(raw, CAPTURE_QA_REFERENCE, id);
      assert.notEqual(audit.inferredDomain, 'community', `${id}: must not be community`);
    }

    // BFSC/swim board still → Community
    const bfsc = auditRawCaptureText(
      'BFSC board meeting Tuesday at 7pm',
      CAPTURE_QA_REFERENCE,
      'bfsc-board',
    );
    assert.equal(bfsc.inferredDomain, 'community', 'BFSC board → community');

    const swimClub = auditRawCaptureText(
      'Swim club board meeting Tuesday at 7pm',
      CAPTURE_QA_REFERENCE,
      'swim-club-board',
    );
    assert.equal(swimClub.inferredDomain, 'community', 'swim club board → community');
  });

  // ── Fix 4: bare "appointment" without medical context is not Health ─────────

  it('Fix 4 — work/client appointments are not Health; doctor/dentist appointments are', () => {
    const nonHealthCases = [
      { id: 'sales-appt', raw: 'Sales appointment Monday at 2pm' },
      { id: 'client-appt', raw: 'Client appointment Wednesday at 10' },
      { id: 'store-appt', raw: 'Store appointment Thursday morning' },
    ];
    for (const { id, raw } of nonHealthCases) {
      const audit = auditRawCaptureText(raw, CAPTURE_QA_REFERENCE, id);
      assert.notEqual(audit.inferredDomain, 'health', `${id}: must not be health`);
    }

    // Medical appointments still → Health
    const dentist = auditRawCaptureText(
      'Dentist appointment next Tuesday at 9am',
      CAPTURE_QA_REFERENCE,
      'dentist-appt',
    );
    assert.equal(dentist.inferredDomain, 'health', 'dentist appointment → health');

    const doctor = auditRawCaptureText(
      'Doctor appointment Monday at 11',
      CAPTURE_QA_REFERENCE,
      'doctor-appt',
    );
    assert.equal(doctor.inferredDomain, 'health', 'doctor appointment → health');
  });

  // ── Fix 5: weekday + time-of-day window captures approximate clock ──────────

  it('Fix 5 — weekday morning/afternoon/evening resolved with correct approximate time', () => {
    const afternoon = auditRawCaptureText(
      'Reagan cheer practice Friday afternoon',
      CAPTURE_QA_REFERENCE,
      'reagan-cheer-afternoon',
    );
    assert.equal(afternoon.promotionEligible, true, 'afternoon capture should promote');
    assert.equal(afternoon.propagatedToPlan, true, 'should appear on Plan');
    assert.equal(afternoon.inferredDomain, 'family', 'domain=family');
    assert.ok(
      afternoon.parsedTime?.includes('2:'),
      `afternoon parsedTime "${afternoon.parsedTime}" should include 2: (2:00 PM ~)`,
    );

    const morning = auditRawCaptureText(
      'Grace volleyball Tuesday morning',
      CAPTURE_QA_REFERENCE,
      'grace-volleyball-morning',
    );
    assert.equal(morning.promotionEligible, true, 'morning capture should promote');
    assert.ok(
      morning.parsedTime?.includes('9:'),
      `morning parsedTime "${morning.parsedTime}" should include 9: (9:00 AM ~)`,
    );

    const evening = auditRawCaptureText(
      'BFSC board meeting Thursday evening',
      CAPTURE_QA_REFERENCE,
      'bfsc-thursday-evening',
    );
    assert.equal(evening.promotionEligible, true, 'evening capture should promote');
    assert.equal(evening.inferredDomain, 'community', 'domain=community');
    assert.ok(
      evening.parsedTime?.includes('6:'),
      `evening parsedTime "${evening.parsedTime}" should include 6: (6:00 PM ~)`,
    );

    // "night" already worked; confirm it's unaffected by the new pattern
    const night = auditRawCaptureText(
      'Reagan cheer Thursday night',
      CAPTURE_QA_REFERENCE,
      'reagan-cheer-night',
    );
    assert.equal(night.promotionEligible, true, 'night capture should still promote');
    assert.ok(
      night.parsedTime?.includes('7:'),
      `night parsedTime "${night.parsedTime}" should include 7: (7:00 PM ~)`,
    );
  });
});
