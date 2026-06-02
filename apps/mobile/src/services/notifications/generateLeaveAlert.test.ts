import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  generateLeaveAlertCandidates,
  leaveAlertPrimaryLine,
  leaveAlertLocationAwarePrimaryLine,
  shouldUseLocationAwareCopy,
  LEAVE_ALERT_MINUTES_BEFORE,
  LEAVE_ALERT_LOCATION_AWARE_SECONDARY,
} from './generateLeaveAlert';
import type { LeaveAlertLocationContext } from './generateLeaveAlert';
import { evaluateConstitutionalCompliance } from './constitutionalCheck';
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

// ── Phase G.2: shouldUseLocationAwareCopy ─────────────────────────────────────

describe('shouldUseLocationAwareCopy', () => {
  it('returns true when region is home and smart leave timing is enabled', () => {
    const ctx: LeaveAlertLocationContext = { currentRegion: 'home', smartLeaveTimingEnabled: true };
    assert.equal(shouldUseLocationAwareCopy(ctx), true);
  });

  it('returns false when region is home but smart leave timing is disabled', () => {
    const ctx: LeaveAlertLocationContext = { currentRegion: 'home', smartLeaveTimingEnabled: false };
    assert.equal(shouldUseLocationAwareCopy(ctx), false);
  });

  it('returns false when region is work', () => {
    const ctx: LeaveAlertLocationContext = { currentRegion: 'work', smartLeaveTimingEnabled: true };
    assert.equal(shouldUseLocationAwareCopy(ctx), false);
  });

  it('returns false when region is away', () => {
    const ctx: LeaveAlertLocationContext = { currentRegion: 'away', smartLeaveTimingEnabled: true };
    assert.equal(shouldUseLocationAwareCopy(ctx), false);
  });

  it('returns false when region is unknown', () => {
    const ctx: LeaveAlertLocationContext = { currentRegion: 'unknown', smartLeaveTimingEnabled: true };
    assert.equal(shouldUseLocationAwareCopy(ctx), false);
  });

  it('returns false when locationContext is undefined (missing context)', () => {
    assert.equal(shouldUseLocationAwareCopy(undefined), false);
  });
});

// ── Phase G.2: leaveAlertLocationAwarePrimaryLine ────────────────────────────

describe('leaveAlertLocationAwarePrimaryLine', () => {
  it('uses starts-at format with displayTime when person is present', () => {
    const event = makeEvent('e1', 30, { displayTime: '2:30 PM' });
    const line = leaveAlertLocationAwarePrimaryLine(event);
    assert.equal(line, "Grace's volleyball practice starts at 2:30 PM.");
  });

  it('uses starts-at format with displayTime when no person label', () => {
    const event = makeEvent('e2', 30, {
      displayPersonLabel: null,
      inferredOwnerLabel: null,
      displayTitle: 'BFSC board meeting',
      displayTime: '7:00 PM',
    });
    const line = leaveAlertLocationAwarePrimaryLine(event);
    assert.equal(line, 'BFSC board meeting starts at 7:00 PM.');
  });
});

// ── Phase G.2: generateLeaveAlertCandidates with locationContext ──────────────

describe('generateLeaveAlertCandidates — Phase G.2 location copy', () => {
  const HOME_SMART_ON: LeaveAlertLocationContext = { currentRegion: 'home', smartLeaveTimingEnabled: true };
  const HOME_SMART_OFF: LeaveAlertLocationContext = { currentRegion: 'home', smartLeaveTimingEnabled: false };
  const WORK: LeaveAlertLocationContext = { currentRegion: 'work', smartLeaveTimingEnabled: true };
  const AWAY: LeaveAlertLocationContext = { currentRegion: 'away', smartLeaveTimingEnabled: true };
  const UNKNOWN: LeaveAlertLocationContext = { currentRegion: 'unknown', smartLeaveTimingEnabled: true };

  it('home + smart enabled: uses starts-at primary and breathing-room secondary', () => {
    const event = makeEvent('e-home-on', 30, { displayTime: '2:30 PM' });
    const [c] = generateLeaveAlertCandidates([event], NOW, HOME_SMART_ON);
    assert.ok(c, 'expected one candidate');
    assert.ok(c.primaryLine.includes('starts at 2:30 PM'), `primary: "${c.primaryLine}"`);
    assert.equal(c.secondaryLine, LEAVE_ALERT_LOCATION_AWARE_SECONDARY);
  });

  it('home + smart disabled: falls back to Phase E copy, no secondary', () => {
    const event = makeEvent('e-home-off', 30);
    const [c] = generateLeaveAlertCandidates([event], NOW, HOME_SMART_OFF);
    assert.ok(c.primaryLine.includes(`starts in ${LEAVE_ALERT_MINUTES_BEFORE} minutes`), `primary: "${c.primaryLine}"`);
    assert.equal(c.secondaryLine, null);
  });

  it('work: falls back to Phase E copy, no secondary', () => {
    const event = makeEvent('e-work', 30);
    const [c] = generateLeaveAlertCandidates([event], NOW, WORK);
    assert.ok(c.primaryLine.includes(`starts in ${LEAVE_ALERT_MINUTES_BEFORE} minutes`));
    assert.equal(c.secondaryLine, null);
  });

  it('away: falls back to Phase E copy, no secondary', () => {
    const event = makeEvent('e-away', 30);
    const [c] = generateLeaveAlertCandidates([event], NOW, AWAY);
    assert.ok(c.primaryLine.includes(`starts in ${LEAVE_ALERT_MINUTES_BEFORE} minutes`));
    assert.equal(c.secondaryLine, null);
  });

  it('unknown: falls back to Phase E copy, no secondary', () => {
    const event = makeEvent('e-unknown', 30);
    const [c] = generateLeaveAlertCandidates([event], NOW, UNKNOWN);
    assert.ok(c.primaryLine.includes(`starts in ${LEAVE_ALERT_MINUTES_BEFORE} minutes`));
    assert.equal(c.secondaryLine, null);
  });

  it('missing context (undefined): falls back to Phase E copy, no secondary', () => {
    const event = makeEvent('e-no-ctx', 30);
    const [c] = generateLeaveAlertCandidates([event], NOW, undefined);
    assert.ok(c.primaryLine.includes(`starts in ${LEAVE_ALERT_MINUTES_BEFORE} minutes`));
    assert.equal(c.secondaryLine, null);
  });
});

// ── Phase G.2: constitutional pass path ──────────────────────────────────────

describe('leave_alert constitutional pass path', () => {
  it('passes constitutional check regardless of conflictRisk being 0', () => {
    const event = makeEvent('e-const', 30);
    const [c] = generateLeaveAlertCandidates([event], NOW);
    assert.ok(c, 'expected one candidate');
    assert.equal(c.conflictRisk, 0, 'conflictRisk should be 0');

    const result = evaluateConstitutionalCompliance(c, {
      recentlyOpenedApp: false,
      openedWithinTwoWeeks: true,
    });
    assert.equal(result.pass, true, `expected pass but got: ${result.failureReason}`);
    assert.equal(result.failureReason, null);
  });

  it('passes constitutional check even when app was recently opened (household high impact)', () => {
    const event = makeEvent('e-const-recent', 30);
    const [c] = generateLeaveAlertCandidates([event], NOW);

    const result = evaluateConstitutionalCompliance(c, {
      recentlyOpenedApp: true,
      openedWithinTwoWeeks: true,
    });
    assert.equal(result.pass, true, `expected pass but got: ${result.failureReason}`);
  });
});
