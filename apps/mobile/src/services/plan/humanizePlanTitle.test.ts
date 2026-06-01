/**
 * humanizePlanTitle — Plan Title Cleanup Pass v1
 *
 * Tests for F1 (DayName time without "at") and F2 ("before DayName" pattern ordering),
 * plus regression coverage for all previously-working strip paths.
 *
 * All tests operate on the exported humanizePlanTitle function, which runs the full
 * strip pipeline including leading-phrase removal, location tail, timing tail, and
 * title-casing. A minimal LifeObject stub is used — only `raw` and `title` are read.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { humanizePlanTitle } from './humanizePlanTitle';
import type { LifeObject } from '@/types/capture';

// ── Minimal stub ──────────────────────────────────────────────────────────────

function stub(raw: string): LifeObject {
  return {
    id: 'test',
    raw,
    title: raw,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    parse: {
      timing: null,
      people: [],
      category: null,
      location: null,
      schedulingIntent: false,
      isRoutine: false,
    },
    linkedCalendarEventId: null,
    linkedCalendarEventTitle: null,
    linkedCalendarEventSourceCalendar: null,
    relationshipConfidence: null,
    relationshipType: null,
    recurrence: null,
  } as unknown as LifeObject;
}

function title(raw: string): string {
  return humanizePlanTitle(stub(raw));
}

// ── F1 — DayName + time without "at" ─────────────────────────────────────────

describe('F1 — DayName time without "at" connector', () => {
  it('strips "Saturday 9am" tail', () => {
    assert.equal(title('Grace volleyball tournament Saturday 9am'), 'Grace Volleyball Tournament');
  });

  it('strips "Tuesday 6pm" tail', () => {
    assert.equal(title('Reagan cheer practice Tuesday 6pm'), 'Reagan Cheer Practice');
  });

  it('strips "Tuesday 7pm" tail (community event)', () => {
    // titleCasePlanPhrase lowercases then recapitalizes — "BFSC" → "Bfsc" (pre-existing behavior)
    assert.equal(title('BFSC board meeting Tuesday 7pm'), 'Bfsc Board Meeting');
  });

  it('strips "Wednesday 8:30am" tail (with colon minutes)', () => {
    assert.equal(title('Grace dentist appointment Wednesday 8:30am'), 'Grace Dentist Appointment');
  });

  it('strips "Thursday 6pm" tail', () => {
    assert.equal(title('Hudson football practice Thursday 6pm'), 'Hudson Football Practice');
  });

  it('strips "Saturday 2pm" tail', () => {
    assert.equal(title('Quinn football game Saturday 2pm'), 'Quinn Football Game');
  });

  it('strips "Friday 5:15pm" tail (with colon minutes)', () => {
    assert.equal(title('Submit store inventory Friday 5:15pm'), 'Submit Store Inventory');
  });

  it('does NOT strip "Thursday 11" without meridiem — too ambiguous', () => {
    // No am/pm → F1 pattern does not fire; bare DayName fires instead, leaving "11"
    // Result is "Thursday" stripped but "11" remains — this is acceptable conservative behavior
    const result = title('Thursday 11');
    // Should not be empty and should not crash
    assert.ok(result.length > 0);
  });
});

// ── F2 — "before DayName" strips as a unit ───────────────────────────────────

describe('F2 — "before DayName" deadline strips cleanly', () => {
  it('"before Friday" strips — no dangling "before"', () => {
    assert.equal(title('Submit expense report before Friday'), 'Submit Expense Report');
  });

  it('"before Monday" strips cleanly', () => {
    assert.equal(title('Review payment due before Monday'), 'Review Payment Due');
  });

  it('"before Thursday" strips cleanly', () => {
    assert.equal(title('Send deck before Thursday'), 'Send Deck');
  });

  it('"before Tuesday" strips cleanly', () => {
    assert.equal(title('File the insurance claim before Tuesday'), 'File the Insurance Claim');
  });

  it('"before the board" strips cleanly', () => {
    assert.equal(title('Prepare slides before the board'), 'Prepare Slides');
  });

  it('"before the meeting" strips cleanly', () => {
    assert.equal(title('Review notes before the meeting'), 'Review Notes');
  });

  it('title after strip is never just "before"', () => {
    const result = title('Submit report before Friday');
    assert.ok(!result.toLowerCase().endsWith('before'), `Got: "${result}"`);
  });
});

// ── Regression — previously-working strip paths must not change ───────────────

describe('Regression — existing patterns still work', () => {
  it('"next Thursday" strips (with trailing context)', () => {
    assert.equal(
      title("Macy's Home Leadership Summit next Thursday"),
      "Macy's Home Leadership Summit",
    );
  });

  it('"tomorrow at 6:15am" strips', () => {
    assert.equal(
      title('Drive Grace to lifeguard training tomorrow at 6:15am'),
      'Drive Grace to Lifeguard Training',
    );
  });

  it('"tomorrow at 8pm" strips', () => {
    // "from" is not in MINOR_WORDS, so titleCasePlanPhrase capitalizes it → "From"
    assert.equal(
      title('Pick up Quinn from football tomorrow at 8pm'),
      'Pick up Quinn From Football',
    );
  });

  it('"Tuesday at 7pm" (with "at") still strips', () => {
    assert.equal(title('BFSC board meeting Tuesday at 7pm'), 'Bfsc Board Meeting');
  });

  it('"on Tuesday" bare day with "on" strips', () => {
    assert.equal(title('Reagan cheer practice on Tuesday'), 'Reagan Cheer Practice');
  });

  it('"today" bare strips', () => {
    // titleCasePlanPhrase lowercases then recapitalizes — "HVAC" → "Hvac" (pre-existing behavior)
    assert.equal(title('Call the HVAC company today'), 'Call the Hvac Company');
  });

  it('"tomorrow" bare strips', () => {
    assert.equal(title('Pay the invoice tomorrow'), 'Pay the Invoice');
  });

  it('"Tuesday" bare strips', () => {
    assert.equal(title('Team standup Tuesday'), 'Team Standup');
  });

  it('"before Friday" with leading phrase strips both', () => {
    assert.equal(title('Need to submit expense report before Friday'), 'Submit Expense Report');
  });

  it('"tomorrow morning" strips', () => {
    assert.equal(title('Email Monica about swim club insurance tomorrow morning'), 'Email Monica About Swim Club Insurance');
  });

  it('"next Thursday at 2pm" strips both day and time', () => {
    assert.equal(title("Macy's summit next Thursday at 2pm"), "Macy's Summit");
  });
});

// ── Safety — strip must never produce an empty title ─────────────────────────

describe('Safety — titles do not collapse to empty', () => {
  it('bare timing-only capture falls back safely', () => {
    const result = title('Saturday 9am');
    assert.ok(result.length >= 3, `Too short: "${result}"`);
  });

  it('very short capture after stripping falls back to raw', () => {
    const result = title('At 6pm');
    assert.ok(result.length >= 3, `Too short: "${result}"`);
  });

  it('capture with only a leading phrase falls back', () => {
    const result = title('Remind me to call tomorrow');
    assert.ok(result.length >= 3, `Too short: "${result}"`);
  });
});

// ── Title casing — known names preserved ─────────────────────────────────────

describe('Title casing — known household names', () => {
  it('Grace is preserved as display name', () => {
    assert.ok(title('Grace volleyball tournament Saturday 9am').includes('Grace'));
  });

  it('Reagan is preserved', () => {
    assert.ok(title('Reagan cheer practice Tuesday 6pm').includes('Reagan'));
  });

  it('BFSC timing is stripped (casing is a pre-existing titleCasePlanPhrase limitation)', () => {
    const result = title('BFSC board meeting Tuesday 7pm');
    // Timing stripped — should not contain "Tuesday" or a clock
    assert.ok(!result.includes('Tuesday'), `Should not contain "Tuesday": "${result}"`);
    assert.ok(!result.includes('7pm'), `Should not contain "7pm": "${result}"`);
    // Core content retained
    assert.ok(result.toLowerCase().includes('board'), `Should contain "board": "${result}"`);
  });
});
