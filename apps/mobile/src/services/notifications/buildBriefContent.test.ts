import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildMorningBriefContent,
  buildEveningPreviewContent,
} from './buildBriefContent';
import type { MeridianCalendarEvent } from '@/types/calendar';

// ── Fixture ───────────────────────────────────────────────────────────────────

const NOW = new Date('2026-06-02T08:00:00.000'); // Tuesday 8 AM local

function makeEvent(
  id: string,
  domain: 'family' | 'work' | 'community',
  hoursFromNow: number,
  overrides: Partial<MeridianCalendarEvent> = {},
): MeridianCalendarEvent {
  const start = new Date(NOW.getTime() + hoursFromNow * 60 * 60 * 1000);
  return {
    id,
    title: `Event ${id}`,
    displayTitle: `Event ${id}`,
    startTime: start,
    endTime: new Date(start.getTime() + 60 * 60 * 1000),
    allDay: false,
    calendarId: 'cal-1',
    calendarName: 'Family',
    status: 'confirmed',
    source: 'google',
    signalClassification: 'meaningful',
    relevance: { isRelevant: true, householdImpact: 'medium', score: 60 },
    inferredPeople: [],
    attribution: { inferredDomain: domain, confidence: 'high' },
    displayPersonLabel: null,
    inferredOwnerLabel: null,
    inferredLifeDomain: domain,
    timingSensitivity: 'medium',
    displayTime: '10:00 AM',
    peopleImpact: 'INDIRECT',
    ...overrides,
  } as unknown as MeridianCalendarEvent;
}

// ── buildMorningBriefContent ──────────────────────────────────────────────────

describe('buildMorningBriefContent', () => {
  it('returns null when no events exist', () => {
    assert.equal(buildMorningBriefContent([], NOW), null);
  });

  it('returns content for a single family event', () => {
    const event = makeEvent('e1', 'family', 2);
    const result = buildMorningBriefContent([event], NOW);
    assert.ok(result, 'expected content');
    assert.equal(result.type, 'morning');
    assert.ok(result.primaryLine.length > 0);
    assert.equal(result.notificationTitle, 'Good morning');
  });

  it('mentions family commitments when family events exist', () => {
    const f1 = makeEvent('f1', 'family', 2);
    const f2 = makeEvent('f2', 'family', 4);
    const result = buildMorningBriefContent([f1, f2], NOW);
    assert.ok(result);
    assert.ok(
      result.primaryLine.toLowerCase().includes('family'),
      `expected "family" in: "${result.primaryLine}"`,
    );
  });

  it('uses breathing room language when family + work exist', () => {
    const f1 = makeEvent('f1', 'family', 2);
    const w1 = makeEvent('w1', 'work', 5);
    const result = buildMorningBriefContent([f1, w1], NOW);
    assert.ok(result);
    assert.ok(
      result.primaryLine.includes('breathing room') || result.primaryLine.includes('family'),
      `expected breathing room or family in: "${result.primaryLine}"`,
    );
  });

  it('includes specific commitment lines', () => {
    const f1 = makeEvent('f1', 'family', 2, { displayTitle: 'Grace volleyball' });
    const result = buildMorningBriefContent([f1], NOW);
    assert.ok(result);
    assert.ok(result.commitmentLines.length > 0, 'expected at least one commitment line');
    assert.ok(result.lines.length >= 2, 'expected primary line + at least one commitment');
  });

  it('caps commitment lines at 3', () => {
    const events = [
      makeEvent('e1', 'family', 1),
      makeEvent('e2', 'family', 2),
      makeEvent('e3', 'family', 3),
      makeEvent('e4', 'family', 4),
      makeEvent('e5', 'family', 5),
    ];
    const result = buildMorningBriefContent(events, NOW);
    assert.ok(result);
    assert.ok(result.commitmentLines.length <= 3, 'expected at most 3 commitment lines');
  });

  it('excludes all-day events', () => {
    const allDay = makeEvent('e1', 'family', 0, { allDay: true });
    const result = buildMorningBriefContent([allDay], NOW);
    assert.equal(result, null, 'all-day event should not produce a brief');
  });

  it('never contains guilt language', () => {
    const events = [makeEvent('e1', 'work', 2), makeEvent('e2', 'work', 4)];
    const result = buildMorningBriefContent(events, NOW);
    if (!result) return;
    const fullText = result.lines.join(' ').toLowerCase();
    const badPhrases = ['you still have', 'unfinished', 'behind', 'you didn\'t', 'remaining'];
    for (const phrase of badPhrases) {
      assert.ok(!fullText.includes(phrase), `found forbidden phrase "${phrase}" in: "${fullText}"`);
    }
  });

  it('prioritises family lines over work lines', () => {
    const family = makeEvent('f1', 'family', 2, { displayTitle: 'Grace volleyball' });
    const work = makeEvent('w1', 'work', 3, { displayTitle: 'Team standup' });
    const result = buildMorningBriefContent([work, family], NOW);
    assert.ok(result);
    // First commitment line should be the family event
    const firstLine = result.commitmentLines[0] ?? '';
    assert.ok(
      firstLine.includes('Grace') || firstLine.toLowerCase().includes('volleyball'),
      `expected family event first, got: "${firstLine}"`,
    );
  });
});

// ── buildEveningPreviewContent ────────────────────────────────────────────────

describe('buildEveningPreviewContent', () => {
  // Use 7:30 PM on June 2 as `now` — tomorrow = June 3.
  // makeEvent uses NOW (8 AM June 2) as base, so to land on June 3 we need
  // hoursFromNow >= 16 (8 AM + 16h = midnight June 3; use 26 for 10 AM June 3).
  const EVENING = new Date('2026-06-02T19:30:00.000'); // 7:30 PM

  it('returns null when tomorrow has no events', () => {
    assert.equal(buildEveningPreviewContent([], EVENING), null);
  });

  it('returns content for a single tomorrow event', () => {
    // NOW (8 AM) + 26h = June 3 10 AM = tomorrow relative to EVENING
    const event = makeEvent('e1', 'family', 26);
    const result = buildEveningPreviewContent([event], EVENING);
    assert.ok(result, 'expected content for tomorrow event');
    assert.equal(result.type, 'evening');
    assert.equal(result.notificationTitle, 'Good evening');
  });

  it('never summarises today — only looks forward', () => {
    // Event 1h from NOW (9 AM) = still June 2 = today
    const todayEvent = makeEvent('today', 'family', 1);
    // Event 26h from NOW = June 3 10 AM = tomorrow
    const tomorrowEvent = makeEvent('tomorrow', 'family', 26);

    const resultToday = buildEveningPreviewContent([todayEvent], EVENING);
    assert.equal(resultToday, null, 'today event should not produce evening preview');

    const resultTomorrow = buildEveningPreviewContent([tomorrowEvent], EVENING);
    assert.ok(resultTomorrow, 'tomorrow event should produce evening preview');
  });

  it('never contains backward-looking language', () => {
    const event = makeEvent('e1', 'family', 26);
    const result = buildEveningPreviewContent([event], EVENING);
    if (!result) return;
    const fullText = result.lines.join(' ').toLowerCase();
    const badPhrases = ["you didn't", "remaining", "you still have", "unfinished", "behind"];
    for (const phrase of badPhrases) {
      assert.ok(!fullText.includes(phrase), `found forbidden phrase "${phrase}" in: "${fullText}"`);
    }
  });

  it('describes a heavy tomorrow when 4+ events exist', () => {
    // 4 events on June 3: 26h, 27h, 28h, 29h from NOW (8 AM June 2)
    const events = Array.from({ length: 4 }, (_, i) =>
      makeEvent(`e${i}`, 'family', 26 + i),
    );
    const result = buildEveningPreviewContent(events, EVENING);
    assert.ok(result);
    assert.ok(
      result.primaryLine.toLowerCase().includes('full') ||
        result.primaryLine.toLowerCase().includes('4'),
      `expected "full" or count in: "${result.primaryLine}"`,
    );
  });
});
