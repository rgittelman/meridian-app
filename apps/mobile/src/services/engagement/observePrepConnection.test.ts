/**
 * O06 — Prep-to-Event Connection Observation — unit tests
 *
 * Inlines all dependencies to avoid the React Native import chain.
 * Same pattern as observeGradeChildAttribution.test.ts.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

// ── Inline types ──────────────────────────────────────────────────────────────

type Confidence = 'high' | 'medium' | 'low';

type LifeObject = {
  id: string;
  title: string;
  status: string;
};

type MeridianCalendarEvent = {
  id: string;
  title: string;
  displayTitle: string;
  startTime: Date;
  displayPersonLabel: string | null;
  inferredOwnerLabel: string | null;
  inferredPeople: Array<{ name: string; confidence: Confidence }>;
};

type ResolvedCaptureLink = {
  capture: LifeObject;
  eventId: string;
  confidence: Confidence;
  source: 'stored' | 'inferred';
};

type PrepConnectionObservation = {
  text: string;
  eventId: string;
  eventTitle: string;
};

// ── Inline helpers ────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function timingToken(eventStart: Date, now: Date): string | null {
  const eventDay = startOfDay(eventStart);
  const today = startOfDay(now);
  const daysDiff = Math.round(
    (eventDay.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (daysDiff < 0) return null;
  if (daysDiff > 6) return null;
  if (daysDiff === 0) return eventStart.getHours() >= 17 ? 'tonight' : 'today';
  if (daysDiff === 1) return 'tomorrow';
  return 'this week';
}

function stripPersonPrefixFromTitle(title: string, person: string): string {
  return title.replace(new RegExp(`^${person}\\s+`, 'i'), '');
}

function peopleForEvent(event: MeridianCalendarEvent): string[] {
  const names = new Set<string>();
  if (event.displayPersonLabel) names.add(event.displayPersonLabel);
  if (event.inferredOwnerLabel) names.add(event.inferredOwnerLabel);
  for (const p of event.inferredPeople) {
    if (p.confidence !== 'low') names.add(p.name);
  }
  return [...names];
}

function eventLabel(event: MeridianCalendarEvent): string {
  const rawTitle = event.displayTitle ?? event.title;
  const person = peopleForEvent(event)[0];
  if (!person) return rawTitle;
  const activity = stripPersonPrefixFromTitle(rawTitle, person);
  return `${person}'s ${activity}`;
}

function observePrepConnection(
  resolvedLinks: readonly ResolvedCaptureLink[],
  eventsById: ReadonlyMap<string, MeridianCalendarEvent>,
  now: Date,
): PrepConnectionObservation | null {
  const eligible = resolvedLinks.filter(
    (link) =>
      link.source === 'stored' ||
      (link.source === 'inferred' && link.confidence === 'high'),
  );

  type Candidate = { link: ResolvedCaptureLink; event: MeridianCalendarEvent };

  const candidates: Candidate[] = eligible
    .flatMap((link): Candidate[] => {
      const event = eventsById.get(link.eventId);
      if (!event) return [];
      if (event.startTime <= now) return [];
      return [{ link, event }];
    })
    .sort((a, b) => a.event.startTime.getTime() - b.event.startTime.getTime());

  for (const { link, event } of candidates) {
    if ((link.capture.title?.trim() ?? '').length < 3) continue;
    const token = timingToken(event.startTime, now);
    if (!token) continue;
    const label = eventLabel(event);
    return {
      text: `Something you captured is connected to ${label} ${token}.`,
      eventId: event.id,
      eventTitle: event.displayTitle ?? event.title,
    };
  }

  return null;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const NOW = new Date('2026-06-11T19:00:00'); // Thursday 7 PM

function hoursFromNow(h: number): Date {
  return new Date(NOW.getTime() + h * 60 * 60 * 1000);
}

function daysFromNow(d: number, hour = 18): Date {
  const base = startOfDay(NOW);
  return new Date(base.getTime() + d * 24 * 60 * 60 * 1000 + hour * 60 * 60 * 1000);
}

function makeEvent(
  id: string,
  title: string,
  startTime: Date,
  personLabel: string | null = null,
): MeridianCalendarEvent {
  return {
    id,
    title,
    displayTitle: title,
    startTime,
    displayPersonLabel: personLabel,
    inferredOwnerLabel: null,
    inferredPeople: [],
  };
}

function makeLink(
  capture: LifeObject,
  eventId: string,
  source: 'stored' | 'inferred',
  confidence: Confidence = 'high',
): ResolvedCaptureLink {
  return { capture, eventId, confidence, source };
}

function makeCapture(id: string, title: string): LifeObject {
  return { id, title, status: 'active' };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('observePrepConnection', () => {

  describe('positive — observation fires', () => {
    it('stored link always eligible — tonight', () => {
      const event = makeEvent('e1', 'volleyball', hoursFromNow(2), 'Grace');
      const result = observePrepConnection(
        [makeLink(makeCapture('c1', 'pack gear'), 'e1', 'stored', 'medium')],
        new Map([['e1', event]]),
        NOW,
      );
      assert.ok(result);
      assert.equal(result.text, "Something you captured is connected to Grace's volleyball tonight.");
      assert.equal(result.eventId, 'e1');
    });

    it('inferred high confidence fires', () => {
      const event = makeEvent('e1', 'volleyball', hoursFromNow(2), 'Grace');
      const result = observePrepConnection(
        [makeLink(makeCapture('c1', 'pack gear'), 'e1', 'inferred', 'high')],
        new Map([['e1', event]]),
        NOW,
      );
      assert.ok(result);
      assert.equal(result.text, "Something you captured is connected to Grace's volleyball tonight.");
    });

    it('timing token: daytime → today', () => {
      const event = makeEvent('e1', 'dentist', new Date('2026-06-11T14:00:00'));
      const result = observePrepConnection(
        [makeLink(makeCapture('c1', 'insurance card'), 'e1', 'stored')],
        new Map([['e1', event]]),
        new Date('2026-06-11T09:00:00'),
      );
      assert.ok(result);
      assert.ok(result.text.endsWith(' today.'), `expected today, got: ${result.text}`);
    });

    it('timing token: tomorrow', () => {
      const event = makeEvent('e1', 'board meeting', daysFromNow(1, 19));
      const result = observePrepConnection(
        [makeLink(makeCapture('c1', 'deck'), 'e1', 'stored')],
        new Map([['e1', event]]),
        NOW,
      );
      assert.ok(result);
      assert.ok(result.text.endsWith(' tomorrow.'), `expected tomorrow, got: ${result.text}`);
    });

    it('timing token: 3 days → this week', () => {
      const event = makeEvent('e1', 'board meeting', daysFromNow(3, 19));
      const result = observePrepConnection(
        [makeLink(makeCapture('c1', 'deck'), 'e1', 'stored')],
        new Map([['e1', event]]),
        NOW,
      );
      assert.ok(result);
      assert.ok(result.text.endsWith(' this week.'), `got: ${result.text}`);
    });

    it('no person in event — uses title directly', () => {
      const event = makeEvent('e1', 'BFSC board meeting', daysFromNow(1, 19), null);
      const result = observePrepConnection(
        [makeLink(makeCapture('c1', 'agenda'), 'e1', 'stored')],
        new Map([['e1', event]]),
        NOW,
      );
      assert.ok(result);
      assert.equal(result.text, 'Something you captured is connected to BFSC board meeting tomorrow.');
    });

    it('multiple links — soonest event wins', () => {
      const e1 = makeEvent('e1', 'soccer', daysFromNow(3, 17), 'Reagan');
      const e2 = makeEvent('e2', 'volleyball', daysFromNow(1, 18), 'Grace');
      const result = observePrepConnection(
        [
          makeLink(makeCapture('c1', 'cleats'), 'e1', 'stored'),
          makeLink(makeCapture('c2', 'knee pads'), 'e2', 'stored'),
        ],
        new Map([['e1', e1], ['e2', e2]]),
        NOW,
      );
      assert.ok(result);
      assert.equal(result.eventId, 'e2', 'should pick the soonest event');
    });
  });

  describe('negative — no observation', () => {
    it('inferred medium confidence → null', () => {
      const event = makeEvent('e1', 'volleyball', hoursFromNow(2), 'Grace');
      const result = observePrepConnection(
        [makeLink(makeCapture('c1', 'gear'), 'e1', 'inferred', 'medium')],
        new Map([['e1', event]]),
        NOW,
      );
      assert.equal(result, null);
    });

    it('inferred low confidence → null', () => {
      const event = makeEvent('e1', 'volleyball', hoursFromNow(2), 'Grace');
      const result = observePrepConnection(
        [makeLink(makeCapture('c1', 'gear'), 'e1', 'inferred', 'low')],
        new Map([['e1', event]]),
        NOW,
      );
      assert.equal(result, null);
    });

    it('event already started (past) → null', () => {
      const event = makeEvent('e1', 'volleyball', hoursFromNow(-1), 'Grace');
      const result = observePrepConnection(
        [makeLink(makeCapture('c1', 'gear'), 'e1', 'stored')],
        new Map([['e1', event]]),
        NOW,
      );
      assert.equal(result, null);
    });

    it('event exactly at now boundary (not strictly future) → null', () => {
      const result = observePrepConnection(
        [makeLink(makeCapture('c1', 'gear'), 'e1', 'stored')],
        new Map([['e1', makeEvent('e1', 'volleyball', NOW, 'Grace')]]),
        NOW,
      );
      assert.equal(result, null);
    });

    it('event beyond 6 days → null', () => {
      const event = makeEvent('e1', 'volleyball', daysFromNow(7, 18), 'Grace');
      const result = observePrepConnection(
        [makeLink(makeCapture('c1', 'gear'), 'e1', 'stored')],
        new Map([['e1', event]]),
        NOW,
      );
      assert.equal(result, null);
    });

    it('capture title too short (< 3 chars) → null', () => {
      const event = makeEvent('e1', 'volleyball', hoursFromNow(2), 'Grace');
      const result = observePrepConnection(
        [makeLink(makeCapture('c1', 'x'), 'e1', 'stored')],
        new Map([['e1', event]]),
        NOW,
      );
      assert.equal(result, null);
    });

    it('capture title exactly 2 chars after trim → null', () => {
      const result = observePrepConnection(
        [makeLink(makeCapture('c1', '  ab  '), 'e1', 'stored')],
        new Map([['e1', makeEvent('e1', 'volleyball', hoursFromNow(2), 'Grace')]]),
        NOW,
      );
      assert.equal(result, null);
    });

    it('no resolvedLinks → null', () => {
      assert.equal(
        observePrepConnection([], new Map(), NOW),
        null,
      );
    });

    it('eventId not found in eventsById → null', () => {
      const result = observePrepConnection(
        [makeLink(makeCapture('c1', 'gear'), 'unknown-event', 'stored')],
        new Map(),
        NOW,
      );
      assert.equal(result, null);
    });

    it('stale/cached calendar — empty resolvedLinks returns null', () => {
      // Hook passes [] when showingCached. Pure evaluator returns null for empty input.
      assert.equal(observePrepConnection([], new Map(), NOW), null);
    });
  });

  describe('copy format', () => {
    it('person prefix already in title is not doubled', () => {
      // displayTitle "Grace volleyball" with person "Grace" → "Grace's volleyball"
      const event = makeEvent('e1', 'Grace volleyball', hoursFromNow(2), 'Grace');
      const result = observePrepConnection(
        [makeLink(makeCapture('c1', 'knee pads'), 'e1', 'stored')],
        new Map([['e1', event]]),
        NOW,
      );
      assert.ok(result);
      assert.equal(result.text, "Something you captured is connected to Grace's volleyball tonight.");
    });

    it('capture title is never exposed in copy', () => {
      const event = makeEvent('e1', 'volleyball', hoursFromNow(2), 'Grace');
      const result = observePrepConnection(
        [makeLink(makeCapture('c1', 'pack shin guards and cleats'), 'e1', 'stored')],
        new Map([['e1', event]]),
        NOW,
      );
      assert.ok(result);
      assert.ok(!result.text.includes('shin guards'), 'capture title must not appear in copy');
      assert.ok(result.text.startsWith('Something you captured'), 'must use humble framing');
    });
  });

});
