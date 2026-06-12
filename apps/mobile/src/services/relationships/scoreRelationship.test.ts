/**
 * Relationship scoring trust tests.
 *
 * Verifies that the confidence fixes prevent false-positive calendar links:
 *  - Medium/low inferred people do not contribute to scoring.
 *  - Captures naming household member A cannot match an event owned by member B.
 *  - Genuine matches (correct person + topic overlap) still score correctly.
 *
 * Does NOT import React Native — uses the real scorer against inline fixtures.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { scoreCaptureEventRelationship } from './scoreRelationship';
import type { LifeObject } from '@/types/capture';
import type { MeridianCalendarEvent } from '@/types/calendar';

// ── Fixture helpers ────────────────────────────────────────────────────────────

function makeCapture(opts: { raw: string; parse?: Partial<LifeObject['parse']> }): LifeObject {
  return {
    id: 'test-id',
    raw: opts.raw,
    title: opts.raw,
    objectType: 'note',
    createdAt: new Date('2026-06-12T00:10:00.000Z'),
    status: 'captured',
    parse: {
      raw: opts.raw,
      people: opts.parse?.people ?? [],
      timing: opts.parse?.timing ?? null,
      category: opts.parse?.category ?? null,
      relatedContexts: [],
      location: null,
      recurrence: null,
      urgency: null,
      emotionalWeight: null,
      isRoutine: false,
    },
    momentumValue: 0,
    recurrence: null,
  } as unknown as LifeObject;
}

function makeEvent(overrides: {
  id?: string;
  title: string;
  displayLabel?: string;
  inferredPeople?: Array<{ name: string; confidence: 'high' | 'medium' | 'low' }>;
  inferredCategory?: string;
  sourceCalendarName?: string;
  startTime?: Date;
}): MeridianCalendarEvent {
  return {
    id: overrides.id ?? 'event-id',
    title: overrides.title,
    rawTitle: overrides.title,
    displayLabel: overrides.displayLabel ?? overrides.title,
    displayTitle: overrides.title,
    inferredPeople: overrides.inferredPeople ?? [],
    inferredCategory: overrides.inferredCategory ?? 'family',
    sourceCalendarName: overrides.sourceCalendarName ?? 'Ryan Gittelman',
    startTime: overrides.startTime ?? new Date('2026-06-13T17:15:00.000Z'),
    signalClassification: 'meaningful',
  } as unknown as MeridianCalendarEvent;
}

/** Simulates the Quinn Hockey Game as it exists on the device. */
const quinnHockeyGame = makeEvent({
  id: 'quinn-hockey-id',
  title: 'Rangers - Beaver Division - Medford Hockey Spring \'26 vs Kings - Beaver',
  displayLabel: 'Quinn · Hockey Game',
  inferredPeople: [
    { name: 'Quinn',  confidence: 'high'   },
    { name: 'Ryan',   confidence: 'medium' },
    { name: 'Crystal',confidence: 'medium' },
    { name: 'Grace',  confidence: 'medium' },
    { name: 'Hudson', confidence: 'medium' },
    { name: 'Reagan', confidence: 'medium' },
  ],
  inferredCategory: 'family',
});

/** A fixed "now" slightly before the event (~26 h window). */
const NOW = new Date('2026-06-12T00:10:00.000Z').getTime();

// ── Suite 1: person mismatch guard ─────────────────────────────────────────────

describe('person mismatch guard', () => {

  it('"Reagan has no school tomorrow" → LOW vs Quinn Hockey', () => {
    const capture = makeCapture({
      raw: 'Reagan has no school tomorrow.',
      parse: {
        people: [{ value: 'Reagan', confidence: 'high', source: 'parse' }],
        timing: { value: { label: 'tomorrow' }, confidence: 'high', source: 'parse' },
        category: { value: 'family', confidence: 'high', source: 'parse' },
      } as LifeObject['parse'],
    });
    const result = scoreCaptureEventRelationship(capture, quinnHockeyGame, NOW);
    assert.equal(result.confidence, 'low',
      `Expected low confidence but got ${result.confidence} (score=${result.score})`);
    assert.equal(result.score, 0);
    assert.ok(result.reason.includes('mismatch_guard'));
  });

  it('"Grace\'s last day of school tomorrow" → LOW vs Quinn Hockey', () => {
    const capture = makeCapture({
      raw: "Grace's last day of school tomorrow.",
      parse: {
        people: [{ value: 'Grace', confidence: 'high', source: 'parse' }],
        timing: { value: { label: 'tomorrow' }, confidence: 'high', source: 'parse' },
        category: { value: 'family', confidence: 'high', source: 'parse' },
      } as LifeObject['parse'],
    });
    const result = scoreCaptureEventRelationship(capture, quinnHockeyGame, NOW);
    assert.equal(result.confidence, 'low');
    assert.equal(result.score, 0);
  });

  it('"Quinn has hockey tomorrow" → not LOW vs Quinn Hockey', () => {
    const capture = makeCapture({
      raw: 'Quinn has hockey tomorrow.',
      parse: {
        people: [{ value: 'Quinn', confidence: 'high', source: 'parse' }],
        timing: { value: { label: 'tomorrow' }, confidence: 'high', source: 'parse' },
        category: { value: 'family', confidence: 'high', source: 'parse' },
      } as LifeObject['parse'],
    });
    const result = scoreCaptureEventRelationship(capture, quinnHockeyGame, NOW);
    assert.notEqual(result.confidence, 'low',
      `Quinn → Quinn hockey should not be LOW (score=${result.score})`);
    assert.ok(result.score > 0);
  });

  it('capture with no household person → no mismatch penalty', () => {
    const capture = makeCapture({
      raw: 'Pack hockey gear for the game.',
      parse: {
        people: [],
        timing: null,
        category: { value: 'family', confidence: 'medium', source: 'parse' },
      } as unknown as LifeObject['parse'],
    });
    const result = scoreCaptureEventRelationship(capture, quinnHockeyGame, NOW);
    assert.ok(!result.reason.includes('mismatch_guard'));
  });

});

// ── Suite 2: confidence filter on inferredPeople ────────────────────────────────

describe('inferredPeople confidence filter', () => {

  it('medium-confidence person on event does not contribute scoring', () => {
    // Grace is medium on Quinn Hockey — a Grace capture should score LOW.
    const graceCapture = makeCapture({
      raw: 'Grace has practice tonight.',
      parse: {
        people: [{ value: 'Grace', confidence: 'high', source: 'parse' }],
        timing: { value: { label: 'tonight' }, confidence: 'high', source: 'parse' },
        category: { value: 'family', confidence: 'high', source: 'parse' },
      } as LifeObject['parse'],
    });
    const result = scoreCaptureEventRelationship(graceCapture, quinnHockeyGame, NOW);
    assert.equal(result.confidence, 'low',
      'Medium-confidence Grace on Quinn Hockey must not produce a match');
  });

  it('high-confidence person on event DOES contribute scoring', () => {
    // Quinn is HIGH on Quinn Hockey — Quinn capture gets a people signal.
    const quinnCapture = makeCapture({
      raw: 'Quinn hockey practice equipment.',
      parse: {
        people: [{ value: 'Quinn', confidence: 'high', source: 'parse' }],
        timing: null,
        category: { value: 'family', confidence: 'medium', source: 'parse' },
      } as unknown as LifeObject['parse'],
    });
    const result = scoreCaptureEventRelationship(quinnCapture, quinnHockeyGame, NOW);
    // Should score > 0 from: people (high Quinn→Quinn) + prep (hockey) + title overlap (hockey)
    assert.ok(result.score > 0, `Expected score > 0, got ${result.score}`);
    assert.notEqual(result.confidence, 'low');
  });

  it('event with all low-confidence people produces 0 from people scoring', () => {
    const allLowEvent = makeEvent({
      title: 'U8 Marlton Chiefs Practice',
      inferredPeople: [
        { name: 'Quinn',  confidence: 'low' },
        { name: 'Reagan', confidence: 'low' },
        { name: 'Grace',  confidence: 'low' },
      ],
    });
    const capture = makeCapture({
      raw: 'Quinn has hockey practice.',
      parse: {
        people: [{ value: 'Quinn', confidence: 'high', source: 'parse' }],
        timing: null,
        category: { value: 'family', confidence: 'medium', source: 'parse' },
      } as unknown as LifeObject['parse'],
    });
    // With no high-confidence people on event, mismatch guard does not trigger
    // (eventHighPeople is empty → returns 0).  Score comes from title overlap only.
    const result = scoreCaptureEventRelationship(capture, allLowEvent, NOW);
    assert.ok(!result.reason.includes('mismatch_guard'),
      'No mismatch guard should fire when event has no high-confidence people');
  });

});

// ── Suite 3: corroboration signal requirement ───────────────────────────────────

describe('corroboration signal requirement', () => {

  it('category + timing alone is not enough — returns LOW', () => {
    // No person, no title overlap, no prep language, no venue signal.
    const capture = makeCapture({
      raw: 'Buy groceries for dinner tonight.',
      parse: {
        people: [],
        timing: { value: { label: 'tonight' }, confidence: 'medium', source: 'parse' },
        category: { value: 'family', confidence: 'medium', source: 'parse' },
      } as unknown as LifeObject['parse'],
    });
    const result = scoreCaptureEventRelationship(capture, quinnHockeyGame, NOW);
    assert.equal(result.confidence, 'low',
      'Generic family+timing capture must not match any event');
    assert.equal(result.score, 0);
  });

  it('title overlap is sufficient corroboration', () => {
    const hockeyCapture = makeCapture({
      raw: 'hockey skates in the car.',
      parse: {
        people: [],
        timing: null,
        category: { value: 'family', confidence: 'low', source: 'parse' },
      } as unknown as LifeObject['parse'],
    });
    const result = scoreCaptureEventRelationship(hockeyCapture, quinnHockeyGame, NOW);
    // "hockey" overlaps with event title token "hockey" → titleScore > 0 → corroboration
    assert.ok(result.score > 0, `Title overlap should provide corroboration (score=${result.score})`);
  });

  it('BRING language + sport event type is sufficient corroboration', () => {
    const bringCapture = makeCapture({
      raw: 'bring skates to the rink.',
      parse: {
        people: [],
        timing: null,
        category: null,
      } as unknown as LifeObject['parse'],
    });
    const result = scoreCaptureEventRelationship(bringCapture, quinnHockeyGame, NOW);
    assert.ok(result.score > 0, 'BRING + hockey event should corroborate');
  });

});

// ── Suite 4: O06 guard — no observation when link absent ──────────────────────

describe('O06 observation guard (no link → no observation)', () => {

  it('observePrepConnection returns null when resolvedLinks is empty', async () => {
    const { observePrepConnection } = await import(
      '@/services/engagement/observePrepConnection'
    );
    const result = observePrepConnection([], new Map(), new Date());
    assert.equal(result, null, 'No resolved links → O06 returns null');
  });

  it('observePrepConnection returns null when only inferred-medium links exist', async () => {
    const { observePrepConnection } = await import(
      '@/services/engagement/observePrepConnection'
    );
    const links = [
      {
        capture: { id: 'cap-1', title: 'Quinn end of year party', raw: 'Quinn end of year party' } as any,
        eventId: 'evt-1',
        source: 'inferred' as const,
        confidence: 'medium' as const,
        relationshipType: 'person_related' as const,
        score: 0.55,
      },
    ];
    const eventsById = new Map([
      ['evt-1', { id: 'evt-1', startTime: new Date(Date.now() + 3_600_000) } as any],
    ]);
    const result = observePrepConnection(links, eventsById, new Date());
    assert.equal(result, null, 'Inferred-medium link must not surface an O06 observation');
  });

});

// ── Suite 5: person-alone is not sufficient corroboration ────────────────────

describe('person-alone corroboration guard', () => {

  it('"Quinn has an end of year party tomorrow" → LOW vs Quinn Hockey', () => {
    // Quinn→Quinn(high) gives peopleScore but NO topic signal (no hockey/sport/venue).
    // Person-alone must not be sufficient corroboration.
    const capture = makeCapture({
      raw: 'Quinn has an end of year party tomorrow.',
      parse: {
        people: [{ value: 'Quinn', confidence: 'high', source: 'parse' }],
        timing: { value: { label: 'tomorrow' }, confidence: 'high', source: 'parse' },
        category: { value: 'family', confidence: 'high', source: 'parse' },
      } as LifeObject['parse'],
    });
    const result = scoreCaptureEventRelationship(capture, quinnHockeyGame, NOW);
    assert.equal(result.confidence, 'low',
      `Quinn party should be LOW (score=${result.score}, reason=${result.reason})`);
    assert.equal(result.score, 0);
  });

  it('"Quinn has hockey tomorrow" → NOT LOW vs Quinn Hockey', () => {
    // "hockey" overlaps with event title → titleScore > 0 → corroboration passes.
    const capture = makeCapture({
      raw: 'Quinn has hockey tomorrow.',
      parse: {
        people: [{ value: 'Quinn', confidence: 'high', source: 'parse' }],
        timing: { value: { label: 'tomorrow' }, confidence: 'high', source: 'parse' },
        category: { value: 'family', confidence: 'high', source: 'parse' },
      } as LifeObject['parse'],
    });
    const result = scoreCaptureEventRelationship(capture, quinnHockeyGame, NOW);
    assert.notEqual(result.confidence, 'low',
      `Quinn hockey should NOT be LOW (score=${result.score})`);
    assert.ok(result.score > 0);
  });

});
