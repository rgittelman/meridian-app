import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { detectReminderIntent, resolveReminderTime } from './detectReminderIntent';
import type { LifeObject } from '@/types/capture';

// ── detectReminderIntent ──────────────────────────────────────────────────────

describe('detectReminderIntent — trigger phrases', () => {
  it('detects "remind me to"', () => {
    const r = detectReminderIntent('Remind me to call Matt at 3pm');
    assert.equal(r.hasIntent, true);
    if (r.hasIntent) assert.equal(r.taskText, 'Call Matt');
  });

  it('detects "remind me at"', () => {
    const r = detectReminderIntent('Remind me at 3pm to call Matt');
    assert.equal(r.hasIntent, true);
    if (r.hasIntent) assert.ok(r.taskText.length > 0);
  });

  it('detects "reminder to"', () => {
    const r = detectReminderIntent('Reminder to submit expense report Friday at 10am');
    assert.equal(r.hasIntent, true);
    if (r.hasIntent) assert.ok(r.taskText.toLowerCase().includes('submit'));
  });

  it('detects "notify me to"', () => {
    const r = detectReminderIntent('Notify me to order pool chemicals tomorrow morning');
    assert.equal(r.hasIntent, true);
    if (r.hasIntent) assert.ok(r.taskText.toLowerCase().includes('order'));
  });

  it('detects "alert me to"', () => {
    const r = detectReminderIntent('Alert me to check the oven in 20 minutes');
    assert.equal(r.hasIntent, true);
    if (r.hasIntent) assert.ok(r.taskText.toLowerCase().includes('check'));
  });

  it('detects "ping me to"', () => {
    const r = detectReminderIntent('Ping me to text Crystal at 5');
    assert.equal(r.hasIntent, true);
    if (r.hasIntent) assert.ok(r.taskText.toLowerCase().includes('text'));
  });

  it('is case-insensitive', () => {
    const r = detectReminderIntent('REMIND ME TO call Matt');
    assert.equal(r.hasIntent, true);
  });
});

describe('detectReminderIntent — implicit captures do not trigger', () => {
  it('does not trigger for plain task capture', () => {
    assert.equal(detectReminderIntent('Call Matt at 3pm').hasIntent, false);
  });

  it('does not trigger for time-only capture', () => {
    assert.equal(detectReminderIntent('Submit expense report Friday at 10am').hasIntent, false);
  });

  it('does not trigger for plain note', () => {
    assert.equal(detectReminderIntent('Order pool chemicals').hasIntent, false);
  });

  it('does not trigger for "text Crystal at 5" without remind prefix', () => {
    assert.equal(detectReminderIntent('Text Crystal at 5').hasIntent, false);
  });

  it('returns false for empty string', () => {
    assert.equal(detectReminderIntent('').hasIntent, false);
  });
});

describe('detectReminderIntent — task text extraction', () => {
  it('strips "remind me to" prefix', () => {
    const r = detectReminderIntent('Remind me to call Matt at 3pm');
    assert.ok(r.hasIntent);
    if (r.hasIntent) {
      assert.ok(!r.taskText.toLowerCase().includes('remind me'));
      assert.ok(r.taskText.toLowerCase().includes('call matt'));
    }
  });

  it('strips trailing time from task text', () => {
    const r = detectReminderIntent('Remind me to call Matt at 3pm');
    assert.ok(r.hasIntent);
    if (r.hasIntent) {
      assert.ok(!r.taskText.toLowerCase().includes('3pm'), `time still in: "${r.taskText}"`);
    }
  });

  it('strips "in X minutes" from task text', () => {
    const r = detectReminderIntent('Alert me to check the oven in 20 minutes');
    assert.ok(r.hasIntent);
    if (r.hasIntent) {
      assert.ok(!r.taskText.toLowerCase().includes('20 minutes'), `time still in: "${r.taskText}"`);
      assert.ok(r.taskText.toLowerCase().includes('check the oven'));
    }
  });

  it('capitalises first letter of task text', () => {
    const r = detectReminderIntent('ping me to text Crystal');
    assert.ok(r.hasIntent);
    if (r.hasIntent) {
      assert.equal(r.taskText.charAt(0), r.taskText.charAt(0).toUpperCase());
    }
  });
});

// ── resolveReminderTime ───────────────────────────────────────────────────────

const NOW = new Date('2026-06-02T14:00:00.000'); // 2 PM local

function makeCapture(raw: string): LifeObject {
  return {
    id: 'test-cap',
    raw,
    status: 'active',
    parse: {
      timing: null,
      people: [],
      location: null,
      category: null,
      emotionalWeight: null,
    },
  } as unknown as LifeObject;
}

describe('resolveReminderTime — relative expressions', () => {
  it('resolves "in 2 minutes"', () => {
    const cap = makeCapture('Remind me to call Matt in 2 minutes');
    const result = resolveReminderTime(cap, NOW);
    assert.ok(result, 'expected a resolved time');
    const diffMs = result!.getTime() - NOW.getTime();
    assert.ok(diffMs > 100_000 && diffMs < 130_000, `expected ~2 min, got ${diffMs}ms`);
  });

  it('resolves "in 1 hour"', () => {
    const cap = makeCapture('Alert me to check the oven in 1 hour');
    const result = resolveReminderTime(cap, NOW);
    assert.ok(result);
    const diffMs = result!.getTime() - NOW.getTime();
    assert.ok(diffMs > 3_500_000 && diffMs < 3_700_000, `expected ~1h, got ${diffMs}ms`);
  });

  it('resolves "in 20 minutes"', () => {
    const cap = makeCapture('Ping me to start the grill in 20 minutes');
    const result = resolveReminderTime(cap, NOW);
    assert.ok(result);
    const diffMs = result!.getTime() - NOW.getTime();
    assert.ok(diffMs > 1_100_000 && diffMs < 1_300_000, `expected ~20min, got ${diffMs}ms`);
  });

  it('returns null for empty capture (no time signal)', () => {
    const cap = makeCapture('Remind me to call Matt');
    const result = resolveReminderTime(cap, NOW);
    assert.equal(result, null);
  });
});
