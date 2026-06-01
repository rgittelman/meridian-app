/**
 * Focus Intelligence v1 — Correction Pass Tests
 *
 * Covers the six fixes in the v1 correction pass:
 * 1. Same-day timing bug (deriveDueWindow)
 * 2. isStressPrevention wired into getTimingWindow
 * 3. Weekly recurring anchor uses timing day, not createdAt
 * 4. Monthly recurring uses proximity gate, not daily
 * 5. All four children get evening child sports scoring
 * 6. isFinancial broadened to keyword-match expense captures
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

(globalThis as Record<string, unknown>).__DEV__ = false;

import { deriveDueWindow, getTimingWindow } from './timingWindow';
import { shouldSurfaceRecurringCapture } from './recurringSurface';
import { bridgeLifeObject } from './bridgeLifeObject';
import { selectUpcomingForFocus } from '@/services/calendar/selectUpcomingForFocus';
import type { ParsedField, TimingHint, CaptureParseResult, LifeObject, LifeObjectRecurrence } from '@/types/capture';
import type { MeridianCalendarEvent } from '@/types/calendar';
import type { EventAttribution } from '@/types/attribution';
import type { SourceCalendarMeta } from '@/types/calendar';

// ── Shared helpers ────────────────────────────────────────────────────────────

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

function makeTiming(label: string, confidence: 'high' | 'medium' | 'low' = 'high'): ParsedField<TimingHint> {
  return { value: { label }, confidence, source: label };
}

function makeMinimalParse(opts: {
  timingLabel?: string;
  category?: 'work' | 'family' | 'financial' | 'health' | 'personal' | 'household';
  emotionalWeight?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
} = {}): CaptureParseResult {
  return {
    raw: '',
    people: [],
    timing: opts.timingLabel ? makeTiming(opts.timingLabel) : null,
    location: null,
    category: opts.category
      ? { value: opts.category, confidence: 'medium', source: opts.category }
      : null,
    urgency: null,
    emotionalWeight: opts.emotionalWeight
      ? { value: opts.emotionalWeight, confidence: 'medium', source: opts.emotionalWeight }
      : null,
    schedulingIntent: false,
    isRoutine: false,
    recurrence: null,
    relatedContexts: [],
  };
}

function makeLifeObject(opts: {
  raw?: string;
  parse?: CaptureParseResult;
  createdAt?: Date;
  recurrence?: LifeObjectRecurrence | null;
} = {}): LifeObject {
  return {
    id: 'test-obj',
    raw: opts.raw ?? '',
    title: opts.raw ?? 'Test item',
    objectType: 'task',
    createdAt: opts.createdAt ?? new Date(),
    status: 'active',
    parse: opts.parse ?? makeMinimalParse(),
    momentumValue: 0.5,
    recurrence: opts.recurrence ?? null,
  };
}

function makeRecurrence(cadence: LifeObjectRecurrence['cadence'], daysOfWeek: number[] = []): LifeObjectRecurrence {
  return { cadence, daysOfWeek, label: cadence };
}

function makeAttribution(overrides: Partial<EventAttribution> = {}): EventAttribution {
  return {
    sourceCalendarId: 'test-cal',
    sourceCalendarName: 'Test Calendar',
    sourceCalendarDisplayLabel: 'Test Calendar',
    ownerType: 'unknown',
    ownerConfidence: 'low',
    ownerPersonId: null,
    ownerDisplayName: null,
    affectedPeople: [],
    inferredDomain: 'personal',
    domainConfidence: 'low',
    sourcePreferences: {},
    ...overrides,
  };
}

function makeStubEvent(overrides: Partial<MeridianCalendarEvent> & {
  startTime?: Date;
  endTime?: Date;
} = {}): MeridianCalendarEvent {
  const start = overrides.startTime ?? new Date(Date.now() + 2 * 3_600_000);
  const end = overrides.endTime ?? new Date(start.getTime() + 3_600_000);
  return {
    id: `event-${Math.random().toString(36).slice(2)}`,
    rawGoogleEventId: 'test-gid',
    rawTitle: overrides.rawTitle ?? overrides.title ?? 'Test Event',
    title: overrides.title ?? 'Test Event',
    displayTitle: overrides.displayTitle ?? overrides.title ?? 'Test Event',
    displaySubtitle: 'Test Calendar',
    displayActivityType: null,
    displayPersonLabel: null,
    startTime: start,
    endTime: end,
    allDay: false,
    status: 'confirmed',
    attendees: [],
    calendarSource: 'google',
    sourceType: 'google_calendar',
    sourceCalendarId: 'test-cal',
    sourceCalendarName: overrides.sourceCalendarName ?? 'Test Calendar',
    sourceCalendarPrimary: true,
    sourceCalendarAccessRole: 'owner',
    attribution: overrides.attribution ?? makeAttribution(),
    inferredPeople: [],
    inferredOwnerLabel: null,
    sourceCalendarDisplayLabel: 'Test Calendar',
    displaySourceLabel: 'Test Calendar',
    attributionLabel: null,
    relevance: {
      relevanceScore: 'medium',
      relevanceReason: 'test',
      relevanceConfidence: 'medium',
      householdImpact: 'medium',
      matchedHouseholdMembers: [],
      sourceRole: 'commitment',
      isRelevant: true,
      preferences: {},
    },
    inferredLifeDomain: overrides.inferredLifeDomain ?? 'personal',
    inferredCategory: overrides.inferredCategory ?? null,
    categoryConfidence: 'medium',
    confidence: 'medium',
    peopleImpact: overrides.peopleImpact ?? 'NONE',
    timingSensitivity: overrides.timingSensitivity ?? 'medium',
    emotionalWeight: 'LOW',
    signalClassification: 'meaningful',
    relatedLifeObjectId: null,
    displayLabel: overrides.displayTitle ?? overrides.title ?? 'Test Event',
    planAttributionLine: 'Test Calendar',
    displayTime: '9:00 AM',
    ...overrides,
  };
}

// ── Fix 1: Same-day timing ────────────────────────────────────────────────────

describe('Fix 1 — same-day label: daysUntil=0 maps to TODAY', () => {
  const todayIdx = new Date().getDay();
  const todayName = DAY_NAMES[todayIdx];
  const tomorrowName = DAY_NAMES[(todayIdx + 1) % 7];
  // 2+ days from now → THIS_WEEK regardless
  const laterName = DAY_NAMES[(todayIdx + 3) % 7];

  it(`"${todayName} 9am" captured today → TODAY`, () => {
    const result = deriveDueWindow(makeTiming(`${todayName} 9am`));
    assert.equal(result, 'TODAY', `same-day label must produce TODAY, not THIS_WEEK`);
  });

  it(`"${tomorrowName}" captured today → TOMORROW`, () => {
    const result = deriveDueWindow(makeTiming(tomorrowName));
    assert.equal(result, 'TOMORROW');
  });

  it(`day 3 days away → THIS_WEEK`, () => {
    const result = deriveDueWindow(makeTiming(laterName));
    assert.equal(result, 'THIS_WEEK');
  });

  it('no timing → LATER', () => {
    assert.equal(deriveDueWindow(null), 'LATER');
  });

  it('"tomorrow" label still resolves to TOMORROW', () => {
    assert.equal(deriveDueWindow(makeTiming('tomorrow at 8pm')), 'TOMORROW');
  });

  it('"today" label still resolves to TODAY', () => {
    assert.equal(deriveDueWindow(makeTiming('today at 3pm')), 'TODAY');
  });
});

// ── Fix 2: isStressPrevention wired ──────────────────────────────────────────

describe('Fix 2 — isStressPrevention gates timing window', () => {
  const baseInput = {
    currentHour: 10,
    isFamilyCommitment: false,
    isFinancial: false,
    isStressPrevention: false,
    hasPeople: false,
    ageHours: 12,
  };

  it('TOMORROW + isStressPrevention → prep (not just today)', () => {
    const result = getTimingWindow({ ...baseInput, dueWindow: 'TOMORROW', isStressPrevention: true });
    assert.equal(result, 'prep');
  });

  it('THIS_WEEK + isStressPrevention + daytime → low-pressure', () => {
    const result = getTimingWindow({ ...baseInput, dueWindow: 'THIS_WEEK', currentHour: 10, isStressPrevention: true });
    assert.equal(result, 'low-pressure');
  });

  it('THIS_WEEK + isStressPrevention + evening (before 21) → low-pressure', () => {
    const result = getTimingWindow({ ...baseInput, dueWindow: 'THIS_WEEK', currentHour: 20, isStressPrevention: true });
    assert.equal(result, 'low-pressure');
  });

  it('THIS_WEEK + isStressPrevention + late night (22) → later (outside window)', () => {
    const result = getTimingWindow({ ...baseInput, dueWindow: 'THIS_WEEK', currentHour: 22, isStressPrevention: true });
    assert.equal(result, 'later');
  });

  it('THIS_WEEK + no stress flags, no age → later', () => {
    const result = getTimingWindow({ ...baseInput, dueWindow: 'THIS_WEEK', ageHours: 1 });
    assert.equal(result, 'later');
  });

  it('OVERDUE always overdue regardless of stress flag', () => {
    const result = getTimingWindow({ ...baseInput, dueWindow: 'OVERDUE', isStressPrevention: true });
    assert.equal(result, 'overdue');
  });

  it('TOMORROW without isStressPrevention at 10am still returns prep (existing behavior preserved)', () => {
    const result = getTimingWindow({ ...baseInput, dueWindow: 'TOMORROW', currentHour: 10 });
    assert.equal(result, 'prep');
  });
});

// ── Fix 3: Weekly recurring anchor ───────────────────────────────────────────

describe('Fix 3 — weekly recurring anchor uses timing label day', () => {
  // A weekly item captured on Monday (1) but with "tuesday" in timing label.
  const mondayCreated = new Date('2026-06-01T09:00:00'); // Monday June 1 2026
  assert.equal(mondayCreated.getDay(), 1, 'fixture date must be Monday');

  const weeklyObj = makeLifeObject({
    parse: makeMinimalParse({ timingLabel: 'tuesday at 6' }),
    createdAt: mondayCreated,
    recurrence: makeRecurrence('weekly'),
  });

  it('surfaces on Tuesday (the timing label day)', () => {
    const tuesday = new Date('2026-06-02T10:00:00'); // Tuesday June 2
    assert.equal(tuesday.getDay(), 2, 'fixture date must be Tuesday');
    assert.equal(shouldSurfaceRecurringCapture(weeklyObj, tuesday), true);
  });

  it('surfaces Monday evening (evening before timing day)', () => {
    const mondayEvening = new Date('2026-06-01T19:00:00'); // Monday 7pm
    assert.equal(shouldSurfaceRecurringCapture(weeklyObj, mondayEvening), true);
  });

  it('does NOT surface Sunday evening (was wrong before fix)', () => {
    const sundayEvening = new Date('2026-05-31T20:00:00'); // Sunday 8pm (before fix, createdAt anchor)
    assert.equal(shouldSurfaceRecurringCapture(weeklyObj, sundayEvening), false,
      'Sunday evening must not surface — Monday evening is the correct prep window');
  });

  it('does NOT surface Monday morning (not the event day or prep evening)', () => {
    const mondayMorning = new Date('2026-06-01T09:00:00');
    assert.equal(shouldSurfaceRecurringCapture(weeklyObj, mondayMorning), false);
  });

  it('explicit daysOfWeek still takes priority over timing label', () => {
    // If daysOfWeek is explicitly set, it should use those (existing path unchanged).
    const withExplicit = makeLifeObject({
      parse: makeMinimalParse({ timingLabel: 'tuesday at 6' }),
      createdAt: mondayCreated,
      recurrence: makeRecurrence('weekly', [3]), // Wednesday (3)
    });
    const wednesday = new Date('2026-06-03T10:00:00');
    assert.equal(wednesday.getDay(), 3, 'fixture must be Wednesday');
    assert.equal(shouldSurfaceRecurringCapture(withExplicit, wednesday), true);

    const tuesday = new Date('2026-06-02T10:00:00');
    // daysOfWeek=[3] means Wednesday; Tuesday should NOT surface via explicit path
    // (timing label not consulted when daysOfWeek is populated)
    assert.equal(shouldSurfaceRecurringCapture(withExplicit, tuesday), false);
  });

  it('no recurrence → always surfaces', () => {
    const noRecurrence = makeLifeObject({ recurrence: null });
    assert.equal(shouldSurfaceRecurringCapture(noRecurrence, new Date()), true);
  });
});

// ── Fix 4: Monthly recurring proximity ───────────────────────────────────────

describe('Fix 4 — monthly recurring uses proximity gate, not daily', () => {
  const monthlyObj = makeLifeObject({
    parse: makeMinimalParse({ timingLabel: 'the 15th of the month' }),
    recurrence: makeRecurrence('monthly'),
  });

  it('surfaces on the 15th (the anchor day)', () => {
    const the15th = new Date('2026-06-15T10:00:00');
    assert.equal(shouldSurfaceRecurringCapture(monthlyObj, the15th), true);
  });

  it('surfaces on the 14th (one day before)', () => {
    const the14th = new Date('2026-06-14T10:00:00');
    assert.equal(shouldSurfaceRecurringCapture(monthlyObj, the14th), true);
  });

  it('does NOT surface on the 3rd (far from anchor)', () => {
    const the3rd = new Date('2026-06-03T10:00:00');
    assert.equal(shouldSurfaceRecurringCapture(monthlyObj, the3rd), false,
      'Monthly item must not surface on a day far from its anchor');
  });

  it('does NOT surface on the 20th (after anchor day)', () => {
    const the20th = new Date('2026-06-20T10:00:00');
    assert.equal(shouldSurfaceRecurringCapture(monthlyObj, the20th), false);
  });

  it('no timing anchor: surfaces last 3 days of month', () => {
    const noAnchorObj = makeLifeObject({
      parse: makeMinimalParse(),
      recurrence: makeRecurrence('monthly'),
    });
    const lastDay = new Date('2026-06-30T10:00:00');
    const secondToLast = new Date('2026-06-29T10:00:00');
    const thirdToLast = new Date('2026-06-28T10:00:00');
    assert.equal(shouldSurfaceRecurringCapture(noAnchorObj, lastDay), true);
    assert.equal(shouldSurfaceRecurringCapture(noAnchorObj, secondToLast), true);
    assert.equal(shouldSurfaceRecurringCapture(noAnchorObj, thirdToLast), true);
  });

  it('no timing anchor: does NOT surface mid-month', () => {
    const noAnchorObj = makeLifeObject({
      parse: makeMinimalParse(),
      recurrence: makeRecurrence('monthly'),
    });
    const midMonth = new Date('2026-06-10T10:00:00');
    assert.equal(shouldSurfaceRecurringCapture(noAnchorObj, midMonth), false,
      'Monthly item with no anchor must not surface mid-month');
  });
});

// ── Fix 5: All four children in evening child sports scoring ─────────────────

describe('Fix 5 — all four children receive evening child sports scoring', () => {
  // Evening context: 8pm timestamp on a specific date.
  const eveningNow = new Date('2026-06-01T20:00:00').getTime();

  function makeChildSportsEvent(name: 'Grace' | 'Reagan' | 'Quinn' | 'Hudson', sport: string, hoursAway = 3): MeridianCalendarEvent {
    return makeStubEvent({
      title: `${name} ${sport}`,
      displayTitle: `${name} ${sport}`,
      rawTitle: `${name} ${sport}`,
      inferredCategory: 'family',
      peopleImpact: 'HIGH',
      timingSensitivity: 'high',
      startTime: new Date(eveningNow + hoursAway * 3_600_000),
      endTime: new Date(eveningNow + (hoursAway + 2) * 3_600_000),
    });
  }

  // isSelected: event appears in the result for a given pool.
  // Note: selectUpcomingForFocus returns events sorted by startTime (not score),
  // so we check presence, not position.
  function isSelected(childEvent: MeridianCalendarEvent, pool: MeridianCalendarEvent[]): boolean {
    const result = selectUpcomingForFocus(pool, eveningNow);
    return result.some((e) => e.id === childEvent.id);
  }

  it('Grace volleyball is selected in an evening pool', () => {
    const grace = makeChildSportsEvent('Grace', 'Volleyball Tournament');
    const work = makeStubEvent({ title: 'Budget Review', inferredCategory: 'work',
      startTime: new Date(eveningNow + 1 * 3_600_000), endTime: new Date(eveningNow + 2 * 3_600_000) });
    assert.ok(isSelected(grace, [work, grace]), 'Grace volleyball must appear in selection');
  });

  it('Reagan cheer is selected in an evening pool', () => {
    const reagan = makeChildSportsEvent('Reagan', 'Cheer Practice');
    const work = makeStubEvent({ title: 'Budget Review', inferredCategory: 'work',
      startTime: new Date(eveningNow + 1 * 3_600_000), endTime: new Date(eveningNow + 2 * 3_600_000) });
    assert.ok(isSelected(reagan, [work, reagan]), 'Reagan cheer must appear in selection');
  });

  it('Quinn football is selected (regression)', () => {
    const quinn = makeChildSportsEvent('Quinn', 'Football Game');
    const work = makeStubEvent({ title: 'Budget Review', inferredCategory: 'work',
      startTime: new Date(eveningNow + 1 * 3_600_000), endTime: new Date(eveningNow + 2 * 3_600_000) });
    assert.ok(isSelected(quinn, [work, quinn]), 'Quinn football regression must hold');
  });

  it('Hudson football is selected (regression)', () => {
    const hudson = makeChildSportsEvent('Hudson', 'Football Practice');
    const work = makeStubEvent({ title: 'Budget Review', inferredCategory: 'work',
      startTime: new Date(eveningNow + 1 * 3_600_000), endTime: new Date(eveningNow + 2 * 3_600_000) });
    assert.ok(isSelected(hudson, [work, hudson]), 'Hudson football regression must hold');
  });

  it('Grace and Quinn receive equivalent scoring treatment (parity test)', () => {
    // With the fix, Grace and Quinn events at the same time should both be selected
    // from a pool that exceeds cap, with equivalent priority.
    const grace = makeChildSportsEvent('Grace', 'Volleyball', 4);
    const quinn = makeChildSportsEvent('Quinn', 'Football', 4);
    // 6 events, evening cap = 5. One will be left out. Neither Grace nor Quinn should be.
    const fillers = [1, 2, 3, 4].map((h) =>
      makeStubEvent({ title: `Filler ${h}`, inferredCategory: 'personal',
        startTime: new Date(eveningNow + h * 3_600_000), endTime: new Date(eveningNow + (h + 1) * 3_600_000) })
    );
    const withGrace = selectUpcomingForFocus([...fillers, grace], eveningNow);
    const withQuinn = selectUpcomingForFocus([...fillers, quinn], eveningNow);
    const graceSelected = withGrace.some((e) => e.id === grace.id);
    const quinnSelected = withQuinn.some((e) => e.id === quinn.id);
    assert.equal(graceSelected, quinnSelected,
      'Grace and Quinn must have equivalent selection outcomes when event content is identical');
  });

  it('all four children appear in a multi-event evening selection', () => {
    const grace = makeChildSportsEvent('Grace', 'Volleyball');
    const reagan = makeChildSportsEvent('Reagan', 'Cheer');
    const quinn = makeChildSportsEvent('Quinn', 'Hockey');
    const hudson = makeChildSportsEvent('Hudson', 'Football');
    const events = selectUpcomingForFocus(
      [grace, reagan, quinn, hudson],
      eveningNow,
      5,
    );
    const titles = events.map((e) => e.title);
    assert.ok(titles.some((t) => /grace/i.test(t)), 'Grace must appear');
    assert.ok(titles.some((t) => /reagan/i.test(t)), 'Reagan must appear');
    assert.ok(titles.some((t) => /quinn/i.test(t)), 'Quinn must appear');
    assert.ok(titles.some((t) => /hudson/i.test(t)), 'Hudson must appear');
  });
});

// ── Fix 6: isFinancial broadened to keyword-match ────────────────────────────

describe('Fix 6 — isFinancial broadened to keyword-match expense captures', () => {
  function makeWorkObj(raw: string): LifeObject {
    return makeLifeObject({
      raw,
      parse: makeMinimalParse({ category: 'work', timingLabel: 'friday' }),
    });
  }

  it('"Submit expense report before Friday" (work category) → isFinancial true', () => {
    const result = bridgeLifeObject(makeWorkObj('Submit expense report before Friday'));
    assert.equal(result.intelligence.isFinancial, true,
      'expense keyword must trigger financial flag regardless of category');
  });

  it('"Review reimbursement Monday" → isFinancial true', () => {
    const result = bridgeLifeObject(makeWorkObj('Review reimbursement Monday'));
    assert.equal(result.intelligence.isFinancial, true);
  });

  it('"Submit invoice by Tuesday" → isFinancial true', () => {
    const result = bridgeLifeObject(makeWorkObj('Submit invoice by Tuesday'));
    assert.equal(result.intelligence.isFinancial, true);
  });

  it('"Review payment due tomorrow" → isFinancial true', () => {
    const result = bridgeLifeObject(makeWorkObj('Review payment due tomorrow'));
    assert.equal(result.intelligence.isFinancial, true);
  });

  it('"Work deck review Wednesday" (no financial keywords) → isFinancial false', () => {
    const result = bridgeLifeObject(makeWorkObj('Work deck review Wednesday'));
    assert.equal(result.intelligence.isFinancial, false,
      'generic work task must not become financial');
  });

  it('"Prepare board presentation Thursday" → isFinancial false', () => {
    const result = bridgeLifeObject(makeWorkObj('Prepare board presentation Thursday'));
    assert.equal(result.intelligence.isFinancial, false);
  });

  it('category=financial still triggers isFinancial (existing path preserved)', () => {
    const financialObj = makeLifeObject({
      raw: 'Pay quarterly taxes',
      parse: makeMinimalParse({ category: 'financial', timingLabel: 'friday' }),
    });
    const result = bridgeLifeObject(financialObj);
    assert.equal(result.intelligence.isFinancial, true,
      'explicit financial category must still work');
  });
});
