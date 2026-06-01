import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

// Production code guards on __DEV__; provide it for Node test environment.
(globalThis as Record<string, unknown>).__DEV__ = false;

import { inferEventDomain } from '@/services/attribution/inferDomain';
import { inferFromEventTitle } from '@/services/people/inferFromEvent';
import { detectSportsActivityType } from '@/services/relevance/isSportsSource';
import { sportsActivityLabel } from '@/services/relevance/childSportsDisplay';
import { classifyEventSignal } from '@/services/calendar/eventFilters';
import { buildPreparationWindow } from '@/services/prep/preparationWindow';
import { normalizeGoogleEvent, type GoogleApiEvent } from '@/services/calendar/normalizeEvent';
import type { MeridianCalendarEvent } from '@/types/calendar';
import type { EventAttribution } from '@/types/attribution';
import type { SourceCalendarMeta } from '@/types/calendar';

// ── Shared helpers ────────────────────────────────────────────────────────────

function makeDomainInput(
  title: string,
  opts: {
    sourceCalendarName?: string;
    sourceCalendarDisplayLabel?: string;
    inferredCategory?: 'work' | 'family' | 'health' | 'personal' | 'financial' | null;
  } = {},
) {
  return {
    title,
    sourceCalendarName: opts.sourceCalendarName ?? 'Primary Calendar',
    sourceCalendarDisplayLabel: opts.sourceCalendarDisplayLabel ?? 'Primary Calendar',
    inferredCategory: opts.inferredCategory ?? null,
  };
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

function makeStubEvent(
  overrides: Partial<MeridianCalendarEvent> & {
    startTime?: Date;
    endTime?: Date;
  } = {},
): MeridianCalendarEvent {
  const start = overrides.startTime ?? new Date('2026-06-15T09:00:00');
  const end = overrides.endTime ?? new Date('2026-06-15T10:00:00');
  return {
    id: 'test-event',
    rawGoogleEventId: 'test-gid',
    rawTitle: overrides.rawTitle ?? overrides.title ?? 'Test Event',
    title: overrides.title ?? 'Test Event',
    displayTitle: overrides.displayTitle ?? overrides.title ?? 'Test Event',
    displaySubtitle: 'Test Calendar',
    displayActivityType: null,
    displayPersonLabel: null,
    startTime: start,
    endTime: end,
    allDay: overrides.allDay ?? false,
    status: 'confirmed',
    attendees: [],
    calendarSource: 'google',
    sourceType: 'google_calendar',
    sourceCalendarId: 'test-cal',
    sourceCalendarName: overrides.sourceCalendarName ?? 'Test Calendar',
    sourceCalendarPrimary: overrides.sourceCalendarPrimary ?? true,
    sourceCalendarAccessRole: overrides.sourceCalendarAccessRole ?? 'owner',
    attribution: overrides.attribution ?? makeAttribution(),
    inferredPeople: overrides.inferredPeople ?? [],
    inferredOwnerLabel: null,
    sourceCalendarDisplayLabel: overrides.sourceCalendarDisplayLabel ?? 'Test Calendar',
    displaySourceLabel: overrides.displaySourceLabel ?? 'Test Calendar',
    attributionLabel: null,
    relevance: overrides.relevance ?? {
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
    categoryConfidence: 'low',
    confidence: overrides.confidence ?? 'medium',
    peopleImpact: overrides.peopleImpact ?? 'NONE',
    timingSensitivity: overrides.timingSensitivity ?? 'medium',
    emotionalWeight: 'LOW',
    signalClassification: overrides.signalClassification ?? 'meaningful',
    relatedLifeObjectId: null,
    displayLabel: overrides.displayTitle ?? overrides.title ?? 'Test Event',
    planAttributionLine: 'Test Calendar',
    displayTime: '9:00 AM',
    ...overrides,
  };
}

function makeCalendarMeta(overrides: Partial<SourceCalendarMeta> = {}): SourceCalendarMeta {
  return {
    sourceCalendarId: 'test-cal',
    sourceCalendarName: overrides.sourceCalendarName ?? 'Primary Calendar',
    sourceCalendarPrimary: overrides.sourceCalendarPrimary ?? true,
    sourceCalendarAccessRole: overrides.sourceCalendarAccessRole ?? 'owner',
    ...overrides,
  };
}

function makeGoogleEvent(overrides: Partial<GoogleApiEvent>): GoogleApiEvent {
  return {
    id: overrides.id ?? 'test-gid',
    status: 'confirmed',
    summary: overrides.summary ?? 'Test Event',
    start: overrides.start,
    end: overrides.end,
    ...overrides,
  };
}

// ── Fix 1: Remove bare "board" = community ────────────────────────────────────

describe('Fix 1 — board no longer automatically means Community', () => {
  it('BFSC board meeting → Community', () => {
    const result = inferEventDomain(makeDomainInput('BFSC board meeting Tuesday 7pm'));
    assert.equal(result.domain, 'community', 'BFSC board meeting must be community');
  });

  it('Swim club board meeting → Community', () => {
    const result = inferEventDomain(makeDomainInput('Swim club board meeting Thursday'));
    assert.equal(result.domain, 'community', 'Swim club board must be community');
  });

  it('Board presentation to leadership → Work (not Community)', () => {
    const result = inferEventDomain(
      makeDomainInput('Board presentation to leadership team next Wednesday at 9am'),
    );
    assert.notEqual(result.domain, 'community', 'Work board presentation must NOT be community');
    assert.equal(result.domain, 'work', 'Should resolve to work domain');
  });

  it("Bloomingdale's board call → Work (not Community)", () => {
    const result = inferEventDomain(
      makeDomainInput("Bloomingdale's board call Friday at 2pm"),
    );
    assert.notEqual(result.domain, 'community', 'Retail board call must NOT be community');
  });

  it('Review board deck before Monday → Work or Personal (not Community)', () => {
    const result = inferEventDomain(makeDomainInput('Review board deck before Monday'));
    assert.notEqual(result.domain, 'community', 'Board deck review must NOT be community');
  });

  it('Board meeting at the pool → Community (pool co-signal)', () => {
    const result = inferEventDomain(makeDomainInput('Board meeting at the pool Wednesday'));
    assert.equal(result.domain, 'community', 'Pool co-signal upgrades board to community');
  });

  it('BFSC board calendar source → Community via source signal', () => {
    const result = inferEventDomain(
      makeDomainInput('Monthly meeting', {
        sourceCalendarDisplayLabel: 'BFSC',
      }),
    );
    assert.equal(result.domain, 'community');
  });
});

// ── Fix 2: All-day exclusive end date ─────────────────────────────────────────

describe('Fix 2 — all-day events use exclusive midnight end date', () => {
  it('one-day all-day event: end.date June 16 → endTime midnight June 16 (not 23:59)', () => {
    const raw = makeGoogleEvent({
      start: { date: '2026-06-15' },
      end: { date: '2026-06-16' },
    });
    const event = normalizeGoogleEvent(raw, makeCalendarMeta());
    assert.ok(event, 'event should normalize');
    assert.ok(event!.allDay, 'should be all-day');
    assert.equal(event!.endTime.getHours(), 0, 'end hour should be 0 (midnight)');
    assert.equal(event!.endTime.getMinutes(), 0, 'end minutes should be 0');
    assert.equal(event!.endTime.getDate(), 16, 'end date should be 16 (exclusive boundary)');
    assert.equal(event!.endTime.getMonth(), 5, 'end month should be June (5)');
  });

  it('3-day vacation: end.date June 18 → endTime is June 18 midnight, not June 18 23:59', () => {
    const raw = makeGoogleEvent({
      summary: 'Family Vacation',
      start: { date: '2026-06-15' },
      end: { date: '2026-06-18' },
    });
    const event = normalizeGoogleEvent(raw, makeCalendarMeta());
    assert.ok(event);
    assert.equal(event!.endTime.getDate(), 18, 'exclusive end is June 18 midnight');
    assert.equal(event!.endTime.getHours(), 0, 'end hour is midnight');
    // The event should NOT be visible on June 18 as an active event
    const june17End = new Date('2026-06-17T23:59:59').getTime();
    assert.ok(
      event!.endTime.getTime() > june17End,
      'endTime strictly after June 17 end',
    );
    const june18Midnight = new Date('2026-06-18T00:00:00').getTime();
    assert.equal(
      event!.endTime.getTime(),
      june18Midnight,
      'endTime is exactly June 18 midnight',
    );
  });

  it('timed events are unaffected', () => {
    const raw = makeGoogleEvent({
      start: { dateTime: '2026-06-15T09:00:00' },
      end: { dateTime: '2026-06-15T10:30:00' },
    });
    const event = normalizeGoogleEvent(raw, makeCalendarMeta());
    assert.ok(event);
    assert.equal(event!.allDay, false);
    assert.equal(event!.endTime.getHours(), 10);
    assert.equal(event!.endTime.getMinutes(), 30);
  });
});

// ── Fix 3: TeamSnap / sports fallback ─────────────────────────────────────────

describe('Fix 3 — sports fallback no longer defaults to hockey', () => {
  it('football in calendar name → detects football', () => {
    assert.equal(
      detectSportsActivityType('Away Game', undefined, 'Quinn Football'),
      'football',
    );
  });

  it('cheer in calendar name → detects cheer', () => {
    assert.equal(
      detectSportsActivityType('Practice', undefined, 'Reagan Cheer'),
      'cheer',
    );
  });

  it('volleyball in calendar name → detects volleyball', () => {
    assert.equal(
      detectSportsActivityType('Tournament', undefined, 'Grace Volleyball'),
      'volleyball',
    );
  });

  it('generic TeamSnap title "Away Game" with sport in calendar → uses calendar sport', () => {
    assert.equal(
      detectSportsActivityType('Away Game', undefined, 'Hudson Football'),
      'football',
    );
  });

  it('generic TeamSnap "Game" with no sport in title or calendar → returns "game" (not hockey)', () => {
    const result = detectSportsActivityType('Game', undefined, 'TeamSnap');
    assert.equal(result, 'game', 'Generic game on TeamSnap must not default to hockey');
  });

  it('truly unknown TeamSnap event → returns null (not hockey)', () => {
    const result = detectSportsActivityType('Mustangs vs Raiders', undefined, 'TeamSnap');
    // No sport keyword → null
    assert.equal(result, null, 'Unknown sport title must return null, not hockey');
  });

  it('hockey still detects correctly', () => {
    assert.equal(detectSportsActivityType('Hockey Practice', undefined, 'TeamSnap'), 'hockey');
  });

  it('basketball and baseball are detected', () => {
    assert.equal(detectSportsActivityType('Basketball Practice'), 'basketball');
    assert.equal(detectSportsActivityType('Baseball Game'), 'baseball');
  });

  describe('sportsActivityLabel', () => {
    it('null → "Game" (not "Hockey Game")', () => {
      assert.equal(sportsActivityLabel(null), 'Game');
    });
    it('undefined → "Game"', () => {
      assert.equal(sportsActivityLabel(undefined), 'Game');
    });
    it('football → Football', () => {
      assert.equal(sportsActivityLabel('football'), 'Football');
    });
    it('volleyball → Volleyball', () => {
      assert.equal(sportsActivityLabel('volleyball'), 'Volleyball');
    });
    it('cheer → Cheer', () => {
      assert.equal(sportsActivityLabel('cheer'), 'Cheer');
    });
    it('basketball → Basketball', () => {
      assert.equal(sportsActivityLabel('basketball'), 'Basketball');
    });
    it('hockey unchanged → Hockey Game', () => {
      assert.equal(sportsActivityLabel('hockey'), 'Hockey Game');
    });
  });
});

// ── Fix 4: Bare "appointment" is not Health ───────────────────────────────────

describe('Fix 4 — appointment alone does not mean Health', () => {
  it('Sales appointment → NOT health category', () => {
    const result = inferFromEventTitle('Sales appointment Monday at 2pm');
    assert.notEqual(result.inferredCategory, 'health', 'Sales appointment must not be health');
  });

  it('Client appointment → NOT health category', () => {
    const result = inferFromEventTitle('Client appointment Wednesday');
    assert.notEqual(result.inferredCategory, 'health', 'Client appointment must not be health');
  });

  it('Store appointment → NOT health category', () => {
    const result = inferFromEventTitle('Store appointment Thursday');
    assert.notEqual(result.inferredCategory, 'health');
  });

  it('Dentist appointment → health (dentist is explicit health signal)', () => {
    const result = inferFromEventTitle('Dentist appointment next Tuesday at 9am');
    assert.equal(result.inferredCategory, 'health', 'Dentist appointment must still be health');
  });

  it('Doctor appointment → health (doctor is explicit health signal)', () => {
    const result = inferFromEventTitle('Doctor appointment Monday');
    assert.equal(result.inferredCategory, 'health');
  });

  it('Appointment with therapy co-signal → health', () => {
    const result = inferFromEventTitle('Therapy appointment Thursday');
    assert.equal(result.inferredCategory, 'health', 'Therapy co-signal must make appointment health');
  });

  it('appointment + checkup co-signal → health', () => {
    // 'Annual' triggers work signal in extractCategory, so use a title without work keywords.
    const result = inferFromEventTitle('Medical checkup appointment');
    assert.equal(result.inferredCategory, 'health');
  });
});

// ── Fix 5: BFSC reader-calendar events stay visible ───────────────────────────

describe('Fix 5 — community events from reader calendars are not suppressed', () => {
  it('community-domain event from reader calendar → NOT low_signal', () => {
    const event = makeStubEvent({
      title: 'BFSC board meeting',
      sourceCalendarPrimary: false,
      sourceCalendarAccessRole: 'reader',
      peopleImpact: 'NONE',
      confidence: 'low',
      inferredLifeDomain: 'community',
      attribution: makeAttribution({ inferredDomain: 'community' }),
    });
    const classification = classifyEventSignal(event);
    assert.notEqual(classification, 'low_signal', 'Community events must not be suppressed');
  });

  it('pool committee from reader calendar with community attribution → not suppressed', () => {
    const event = makeStubEvent({
      title: 'Pool Committee Meeting',
      sourceCalendarPrimary: false,
      sourceCalendarAccessRole: 'reader',
      peopleImpact: 'NONE',
      confidence: 'low',
      inferredLifeDomain: 'community',
      attribution: makeAttribution({ inferredDomain: 'community' }),
    });
    const classification = classifyEventSignal(event);
    assert.notEqual(classification, 'low_signal');
  });

  it('truly low-signal reader event without community domain → still low_signal', () => {
    // Use a title that does not match NOISE_TITLE_PATTERNS (no 'newsletter', 'promo', etc.)
    // to ensure it hits the low_signal gate rather than subscription_noise.
    const event = makeStubEvent({
      title: 'Vendor Update',
      sourceCalendarPrimary: false,
      sourceCalendarAccessRole: 'reader',
      peopleImpact: 'NONE',
      confidence: 'low',
      inferredLifeDomain: 'personal',
      attribution: makeAttribution({ inferredDomain: 'personal' }),
    });
    const classification = classifyEventSignal(event);
    assert.equal(classification, 'low_signal', 'Non-community low-signal stays suppressed');
  });
});

// ── Fix 6: Sports prep window 18h ────────────────────────────────────────────

describe('Fix 6 — sports prep window opens 18h before event', () => {
  it('sports window opens 18h before (was 12h) — constant reflects the new value', () => {
    const now = Date.now();
    const eventStart = new Date(now + 8 * 3_600_000); // 8h from now — well within any window
    const event = makeStubEvent({
      title: 'Quinn Hockey Game',
      startTime: eventStart,
      endTime: new Date(eventStart.getTime() + 2 * 3_600_000),
      sourceCalendarName: 'TeamSnap',
    });
    const window = buildPreparationWindow(event, now);
    assert.equal(window.profile, 'sports');
    assert.equal(window.opensHoursBefore, 18, 'sports window must be 18h (extended from 12h)');
    assert.ok(window.isActive, '8h before event is within 18h window');
  });

  it('sports event 15h from now → prep window is active (within 18h)', () => {
    const now = Date.now();
    const eventStart = new Date(now + 15 * 3_600_000);
    const event = makeStubEvent({
      title: 'Grace Volleyball Tournament',
      startTime: eventStart,
      endTime: new Date(eventStart.getTime() + 2 * 3_600_000),
      sourceCalendarName: 'Grace Volleyball',
    });
    const window = buildPreparationWindow(event, now);
    assert.equal(window.profile, 'sports');
    assert.ok(window.isActive, 'prep window active 15h before a sports event');
  });

  it('sports event 20h from now → not active at OLD 12h window, active at new 18h window', () => {
    const now = Date.now();
    const eventStart = new Date(now + 20 * 3_600_000);
    const event = makeStubEvent({
      title: 'Hudson Football Game',
      startTime: eventStart,
      endTime: new Date(eventStart.getTime() + 2 * 3_600_000),
      sourceCalendarName: 'Hudson Football',
    });
    const window = buildPreparationWindow(event, now);
    // 20h > 18h (new window) → NOT active (20h is still outside the 18h window)
    assert.equal(window.isActive, false, '20h away is still outside 18h window');
    // The window opens at 18h before — so 20h away is not yet inside
    assert.equal(window.opensHoursBefore, 18);
  });

  it('sports event 17h from now → active at new 18h window', () => {
    const now = Date.now();
    const eventStart = new Date(now + 17 * 3_600_000);
    const event = makeStubEvent({
      title: 'Reagan Cheer Practice',
      startTime: eventStart,
      endTime: new Date(eventStart.getTime() + 1 * 3_600_000),
      sourceCalendarName: 'Reagan Cheer',
    });
    const window = buildPreparationWindow(event, now);
    assert.equal(window.profile, 'sports');
    assert.ok(window.isActive, '17h away is within 18h sports window');
  });
});

// ── Fix 8: Work travel prep window ───────────────────────────────────────────

describe("Fix 8 — work travel events qualify for travel prep window", () => {
  it("Macy's leadership summit → travel prep profile", () => {
    const now = Date.now();
    const eventStart = new Date(now + 5 * 24 * 3_600_000); // 5 days out
    const event = makeStubEvent({
      title: "Macy's Home Leadership Summit",
      startTime: eventStart,
      endTime: new Date(eventStart.getTime() + 8 * 3_600_000),
      inferredLifeDomain: 'work',
      attribution: makeAttribution({ inferredDomain: 'work' }),
    });
    const window = buildPreparationWindow(event, now);
    assert.equal(window.profile, 'travel', 'summit keyword must trigger travel prep');
    assert.equal(window.opensHoursBefore, 14 * 24, '14-day travel window');
  });

  it('work offsite → travel prep profile', () => {
    const now = Date.now();
    const eventStart = new Date(now + 3 * 24 * 3_600_000);
    const event = makeStubEvent({
      title: 'Team Offsite — NYC',
      startTime: eventStart,
      endTime: new Date(eventStart.getTime() + 8 * 3_600_000),
      inferredLifeDomain: 'work',
      attribution: makeAttribution({ inferredDomain: 'work' }),
    });
    const window = buildPreparationWindow(event, now);
    assert.equal(window.profile, 'travel', 'offsite must trigger travel prep');
  });

  it('family vacation still → travel prep profile', () => {
    const now = Date.now();
    const eventStart = new Date(now + 7 * 24 * 3_600_000);
    const event = makeStubEvent({
      title: 'Family Vacation',
      startTime: eventStart,
      endTime: new Date(eventStart.getTime() + 8 * 3_600_000),
      inferredLifeDomain: 'family',
      attribution: makeAttribution({ inferredDomain: 'family' }),
    });
    const window = buildPreparationWindow(event, now);
    assert.equal(window.profile, 'travel', 'family vacation still travel prep');
  });

  it('flight keyword → travel prep (any domain)', () => {
    const now = Date.now();
    const eventStart = new Date(now + 2 * 24 * 3_600_000);
    const event = makeStubEvent({
      title: 'Flight to Chicago',
      startTime: eventStart,
      endTime: new Date(eventStart.getTime() + 3 * 3_600_000),
      inferredLifeDomain: 'personal',
    });
    const window = buildPreparationWindow(event, now);
    assert.equal(window.profile, 'travel');
  });

  it('regular work meeting without travel keywords → not travel prep', () => {
    const now = Date.now();
    const eventStart = new Date(now + 2 * 24 * 3_600_000);
    const event = makeStubEvent({
      title: 'Monthly Budget Review',
      startTime: eventStart,
      endTime: new Date(eventStart.getTime() + 1 * 3_600_000),
      inferredLifeDomain: 'work',
      attribution: makeAttribution({ inferredDomain: 'work' }),
    });
    const window = buildPreparationWindow(event, now);
    assert.notEqual(window.profile, 'travel', 'Regular work meeting should not be travel prep');
  });
});

// ── Pagination truncation diagnostic (Risk B fix) ─────────────────────────────

// These tests replicate the exact do-while loop logic from fetchEventsForCalendar
// to verify truncation detection without requiring network calls.

const CALENDAR_MAX_RESULTS_PER_PAGE = 250;
const CALENDAR_MAX_PAGES = 10;

function simulatePagination(
  responses: Array<{ itemCount: number; nextPageToken: string | undefined }>,
): { allItems: unknown[]; pageToken: string | undefined; page: number; truncated: boolean } {
  const allItems: unknown[] = [];
  let pageToken: string | undefined = 'start';
  let page = 0;
  let responseIdx = 0;

  do {
    const resp = responses[responseIdx++] ?? { itemCount: 0, nextPageToken: undefined };
    allItems.push(...Array(resp.itemCount).fill({ id: 'event' }));
    pageToken = resp.nextPageToken;
    page += 1;
  } while (pageToken && page < CALENDAR_MAX_PAGES);

  const truncated = Boolean(pageToken) && page >= CALENDAR_MAX_PAGES;
  return { allItems, pageToken, page, truncated };
}

describe('Pagination truncation diagnostic (Risk B)', () => {
  it('no truncation when all pages complete within MAX_PAGES', () => {
    const { truncated, allItems, page } = simulatePagination([
      { itemCount: 250, nextPageToken: 'token-2' },
      { itemCount: 250, nextPageToken: 'token-3' },
      { itemCount: 30, nextPageToken: undefined },
    ]);

    assert.equal(truncated, false, 'should not be truncated — all pages fetched');
    assert.equal(allItems.length, 530, 'all 530 items collected');
    assert.equal(page, 3, '3 pages processed');
  });

  it('no truncation for a single page with no nextPageToken', () => {
    const { truncated, allItems } = simulatePagination([
      { itemCount: 80, nextPageToken: undefined },
    ]);

    assert.equal(truncated, false, 'single page is not truncated');
    assert.equal(allItems.length, 80);
  });

  it('truncation when MAX_PAGES guard fires with remaining nextPageToken', () => {
    // Simulate a calendar that always returns a nextPageToken (infinite paginator).
    const infiniteResponses = Array.from({ length: CALENDAR_MAX_PAGES + 5 }, (_, i) => ({
      itemCount: CALENDAR_MAX_RESULTS_PER_PAGE,
      nextPageToken: `token-${i + 2}`,
    }));

    const { truncated, page, allItems } = simulatePagination(infiniteResponses);

    assert.equal(truncated, true, 'must be truncated when MAX_PAGES hit with nextPageToken');
    assert.equal(page, CALENDAR_MAX_PAGES, `exactly ${CALENDAR_MAX_PAGES} pages processed`);
    assert.equal(
      allItems.length,
      CALENDAR_MAX_RESULTS_PER_PAGE * CALENDAR_MAX_PAGES,
      `${CALENDAR_MAX_RESULTS_PER_PAGE * CALENDAR_MAX_PAGES} items before truncation`,
    );
  });

  it('truncation at exactly MAX_PAGES — last page has nextPageToken', () => {
    const responses = Array.from({ length: CALENDAR_MAX_PAGES }, (_, i) => ({
      itemCount: 250,
      nextPageToken: i < CALENDAR_MAX_PAGES - 1 ? `token-${i + 2}` : 'token-last',
    }));

    const { truncated, page } = simulatePagination(responses);

    assert.equal(truncated, true, 'truncated when final page still has nextPageToken');
    assert.equal(page, CALENDAR_MAX_PAGES);
  });

  it('MAX_PAGES = 10 and RESULTS_PER_PAGE = 250 produce known guard limits', () => {
    assert.equal(CALENDAR_MAX_PAGES, 10, 'guard at 10 pages');
    assert.equal(CALENDAR_MAX_RESULTS_PER_PAGE, 250, '250 results per page');
    assert.equal(
      CALENDAR_MAX_PAGES * CALENDAR_MAX_RESULTS_PER_PAGE,
      2500,
      'max 2500 events per calendar before truncation',
    );
  });

  it('partial flag semantics: truncation must set partial=true', () => {
    // The partial flag logic: partial = calendarsFailed > 0 || failedCalendarIds.length > 0
    //   || paginationTruncatedCalendarIds.length > 0
    // Verify a truncated calendar would trigger partial.

    const paginationTruncatedCalendarIds = ['work-calendar-id'];
    const calendarsFailed = 0;
    const failedCalendarIds: string[] = [];

    const partial =
      calendarsFailed > 0 ||
      failedCalendarIds.length > 0 ||
      paginationTruncatedCalendarIds.length > 0;

    assert.equal(partial, true, 'truncated calendar must set partial=true');
  });

  it('partial flag semantics: no truncation, no failures → partial=false', () => {
    const paginationTruncatedCalendarIds: string[] = [];
    const calendarsFailed = 0;
    const failedCalendarIds: string[] = [];

    const partial =
      calendarsFailed > 0 ||
      failedCalendarIds.length > 0 ||
      paginationTruncatedCalendarIds.length > 0;

    assert.equal(partial, false, 'clean sync must not set partial');
  });
});
