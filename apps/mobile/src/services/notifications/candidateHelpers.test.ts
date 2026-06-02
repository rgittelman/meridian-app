import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  stripPersonPrefixFromTitle,
  commitmentBriefLine,
} from './candidateHelpers';
import type { MeridianCalendarEvent } from '@/types/calendar';

// ── stripPersonPrefixFromTitle ────────────────────────────────────────────────

describe('stripPersonPrefixFromTitle', () => {
  it('strips "Name · Rest" format', () => {
    assert.equal(stripPersonPrefixFromTitle('Hudson · Hockey Game', 'Hudson'), 'Hockey Game');
  });

  it('strips "Name • Rest" format (bullet variant)', () => {
    assert.equal(stripPersonPrefixFromTitle('Hudson • Hockey Game', 'Hudson'), 'Hockey Game');
  });

  it('strips "Name - Rest" format', () => {
    assert.equal(stripPersonPrefixFromTitle('Hudson - Hockey Game', 'Hudson'), 'Hockey Game');
  });

  it('strips bare space prefix "Name Rest"', () => {
    assert.equal(stripPersonPrefixFromTitle('Grace volleyball practice', 'Grace'), 'volleyball practice');
  });

  it('is case-insensitive', () => {
    assert.equal(stripPersonPrefixFromTitle('hudson · Hockey Game', 'Hudson'), 'Hockey Game');
  });

  it('leaves title unchanged when no person prefix matches', () => {
    assert.equal(stripPersonPrefixFromTitle('BFSC Board Meeting', 'Hudson'), 'BFSC Board Meeting');
  });

  it('leaves title unchanged when it does not start with the person name', () => {
    assert.equal(stripPersonPrefixFromTitle('Hockey Game', 'Hudson'), 'Hockey Game');
  });

  it('handles person name that appears mid-title (does not strip)', () => {
    assert.equal(
      stripPersonPrefixFromTitle('Saturday Hudson Hockey', 'Hudson'),
      'Saturday Hudson Hockey',
    );
  });
});

// ── commitmentBriefLine — name duplication regression ────────────────────────

function makeMinimalEvent(
  title: string,
  displayPersonLabel: string | null,
  displayTime = '7:00 PM',
): MeridianCalendarEvent {
  return {
    id: 'e1',
    title,
    displayTitle: title,
    displayPersonLabel,
    inferredOwnerLabel: null,
    inferredPeople: [],
    startTime: new Date(),
    endTime: new Date(),
    allDay: false,
    displayTime,
    calendarId: 'cal',
    calendarName: 'Family',
    status: 'confirmed',
    source: 'google',
    signalClassification: 'meaningful',
    relevance: { isRelevant: true, householdImpact: 'medium', score: 60 },
    attribution: { inferredDomain: 'family', confidence: 'high' },
    inferredLifeDomain: 'family',
    timingSensitivity: 'high',
    peopleImpact: 'DIRECT',
  } as unknown as MeridianCalendarEvent;
}

describe('commitmentBriefLine — name duplication', () => {
  it('does not duplicate person name when title is "Name · Event"', () => {
    const event = makeMinimalEvent('Hudson · Hockey Game', 'Hudson');
    const line = commitmentBriefLine(event);
    // Must not produce "Hudson has Hudson · Hockey Game"
    assert.ok(
      !line.includes('Hudson · Hockey Game'),
      `name + original title leaked into: "${line}"`,
    );
    assert.ok(line.startsWith('Hudson has'), `expected "Hudson has ..." in: "${line}"`);
    assert.ok(line.includes('Hockey Game'), `expected "Hockey Game" in: "${line}"`);
  });

  it('does not duplicate person name when title starts with bare name', () => {
    const event = makeMinimalEvent('Grace volleyball practice', 'Grace');
    const line = commitmentBriefLine(event);
    assert.ok(!line.toLowerCase().includes('grace grace'), `double name in: "${line}"`);
    assert.ok(line.includes('volleyball practice'), `activity missing from: "${line}"`);
  });

  it('produces correct output for event with no person prefix in title', () => {
    const event = makeMinimalEvent('BFSC Board Meeting', 'Ryan');
    const line = commitmentBriefLine(event);
    assert.equal(line, 'Ryan has BFSC Board Meeting 7:00 pm.');
  });

  it('produces correct output when no person label exists', () => {
    const event = makeMinimalEvent('BFSC Board Meeting', null);
    const line = commitmentBriefLine(event);
    assert.equal(line, 'BFSC Board Meeting 7:00 pm.');
  });

  it('handles tomorrow time correctly', () => {
    const event = makeMinimalEvent('Hudson · Hockey Game', 'Hudson', 'tomorrow 7:00 PM');
    const line = commitmentBriefLine(event);
    assert.ok(line.includes('Hockey Game'), `activity missing from: "${line}"`);
    assert.ok(line.includes('tomorrow'), `tomorrow missing from: "${line}"`);
    assert.ok(!line.toLowerCase().includes('hudson · hockey'), `double prefix in: "${line}"`);
  });
});
