import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  generateLeaveAlertCandidates,
  leaveAlertPrimaryLine,
  LEAVE_ALERT_MINUTES_BEFORE,
} from './generateLeaveAlert';
import type { MeridianCalendarEvent } from '@/types/calendar';

// ── Fixture helpers ───────────────────────────────────────────────────────────

const NOW = new Date('2026-06-02T14:00:00.000Z'); // 2:00 PM UTC

/**
 * Builds a minimal household-relevant timed event at a given offset from NOW.
 * `minutesFromNow` is the event start relative to NOW.
 */
function makeEvent(
  id: string,
  minutesFromNow: number,
  overrides: Partial<MeridianCalendarEvent> = {},
): MeridianCalendarEvent {
  const startTime = new Date(NOW.getTime() + minutesFromNow * 60_000);
  return {
    id,
    title: 'Grace volleyball practice',
    displayTitle: 'Grace volleyball practice',
    startTime,
    endTime: new Date(startTime.getTime() + 90 * 60_000),
    allDay: false,
    calendarId: 'cal-1',
    calendarName: 'Family',
    status: 'confirmed',
    source: 'google',
    signalClassification: 'meaningful',
    relevance: { isRelevant: true, householdImpact: 'high', score: 80 },
    inferredPeople: [],
    attribution: { inferredDomain: 'family', confidence: 'high' },
    displayPersonLabel: 'Grace',
    inferredOwnerLabel: null,
    inferredLifeDomain: 'family',
    timingSensitivity: 'high',
    displayTime: '2:30 PM',
    peopleImpact: 'DIRECT',
    ...overrides,
  } as unknown as MeridianCalendarEvent;
}

// ── leaveAlertPrimaryLine ─────────────────────────────────────────────────────

describe('leaveAlertPrimaryLine', () => {
  it('names the person and event when person label is available', () => {
    const event = makeEvent('e1', 30);
    const line = leaveAlertPrimaryLine(event);
    assert.equal(line, `Grace's volleyball practice starts in ${LEAVE_ALERT_MINUTES_BEFORE} minutes.`);
  });

  it('uses event title directly when no person label', () => {
    const event = makeEvent('e2', 30, { displayPersonLabel: null, inferredOwnerLabel: null });
    const line = leaveAlertPrimaryLine(event);
    assert.equal(line, `Grace volleyball practice starts in ${LEAVE_ALERT_MINUTES_BEFORE} minutes.`);
  });

  it('always includes the commitment name — never generic copy', () => {
    const event = makeEvent('e3', 30, { displayTitle: 'BFSC board meeting', displayPersonLabel: null, inferredOwnerLabel: null });
    const line = leaveAlertPrimaryLine(event);
    assert.ok(line.includes('BFSC board meeting'), `expected commitment name in: "${line}"`);
    assert.ok(!line.includes('Your commitment'), 'should not use generic fallback when title is known');
  });
});

// ── generateLeaveAlertCandidates ──────────────────────────────────────────────

describe('generateLeaveAlertCandidates', () => {
  it('generates a candidate for an event 30 minutes away', () => {
    const event = makeEvent('e-30', 30);
    const candidates = generateLeaveAlertCandidates([event], NOW);
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].type, 'leave_alert');
    assert.equal(candidates[0].sourceEventId, 'e-30');
  });

  it('generates a candidate for an event 60 minutes away (alert fires in 30 min — inside window)', () => {
    const event = makeEvent('e-60', 60);
    const candidates = generateLeaveAlertCandidates([event], NOW);
    assert.equal(candidates.length, 1);
  });

  it('does not generate for an event 120 minutes away (alert fires in 90 min — outside 60-min window)', () => {
    const event = makeEvent('e-120', 120);
    const candidates = generateLeaveAlertCandidates([event], NOW);
    assert.equal(candidates.length, 0);
  });

  it('does not generate when the alert time has already passed (event starts in 10 min)', () => {
    // Event starts in 10 min → alert would have fired 20 min ago
    const event = makeEvent('e-past', 10);
    const candidates = generateLeaveAlertCandidates([event], NOW);
    assert.equal(candidates.length, 0);
  });

  it('does not generate for all-day events', () => {
    const event = makeEvent('e-allday', 30, { allDay: true });
    const candidates = generateLeaveAlertCandidates([event], NOW);
    assert.equal(candidates.length, 0);
  });

  it('does not generate for non-household-relevant events', () => {
    const event = makeEvent('e-irrelevant', 30, {
      relevance: { isRelevant: false } as unknown,
    } as Partial<MeridianCalendarEvent>);
    const candidates = generateLeaveAlertCandidates([event], NOW);
    assert.equal(candidates.length, 0);
  });

  it('does not generate for events that are not plan-visible (signalClassification)', () => {
    const event = makeEvent('e-noise', 30, {
      signalClassification: 'subscription_noise',
    } as Partial<MeridianCalendarEvent>);
    const candidates = generateLeaveAlertCandidates([event], NOW);
    assert.equal(candidates.length, 0);
  });

  it('window starts exactly at T-30 min', () => {
    const event = makeEvent('e-window', 30);
    const candidates = generateLeaveAlertCandidates([event], NOW);
    const candidate = candidates[0];
    assert.ok(candidate, 'expected one candidate');
    const expectedWindowStart = new Date(event.startTime.getTime() - LEAVE_ALERT_MINUTES_BEFORE * 60_000);
    assert.equal(candidate.targetWindowStart.getTime(), expectedWindowStart.getTime());
  });

  it('generates one candidate per eligible event', () => {
    const grace = makeEvent('e-grace', 30, { displayTitle: 'Grace volleyball' });
    const bfsc = makeEvent('e-bfsc', 60, { displayTitle: 'BFSC board meeting', displayPersonLabel: null });
    const candidates = generateLeaveAlertCandidates([grace, bfsc], NOW);
    assert.equal(candidates.length, 2);
    const types = candidates.map((c) => c.type);
    assert.ok(types.every((t) => t === 'leave_alert'));
  });

  it('each candidate primary line names the specific commitment', () => {
    const grace = makeEvent('e-g', 30, { displayTitle: 'Grace volleyball', displayPersonLabel: 'Grace' });
    const bfsc = makeEvent('e-b', 60, { displayTitle: 'BFSC board meeting', displayPersonLabel: null, inferredOwnerLabel: null });
    const candidates = generateLeaveAlertCandidates([grace, bfsc], NOW);

    const graceCandidate = candidates.find((c) => c.sourceEventId === 'e-g');
    const bfscCandidate = candidates.find((c) => c.sourceEventId === 'e-b');

    assert.ok(graceCandidate?.primaryLine.includes('Grace'), `Grace line: "${graceCandidate?.primaryLine}"`);
    assert.ok(bfscCandidate?.primaryLine.includes('BFSC board meeting'), `BFSC line: "${bfscCandidate?.primaryLine}"`);
  });

  it('candidate has high timing sensitivity', () => {
    const event = makeEvent('e-ts', 30);
    const candidates = generateLeaveAlertCandidates([event], NOW);
    assert.equal(candidates[0].timingSensitivity, 'high');
  });

  it('candidate has high confidence', () => {
    const event = makeEvent('e-conf', 30);
    const candidates = generateLeaveAlertCandidates([event], NOW);
    assert.equal(candidates[0].confidence, 'high');
  });

  it('empty events list returns no candidates', () => {
    const candidates = generateLeaveAlertCandidates([], NOW);
    assert.equal(candidates.length, 0);
  });
});
