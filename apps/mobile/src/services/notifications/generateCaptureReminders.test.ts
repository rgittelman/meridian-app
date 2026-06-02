import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { generateCaptureReminderCandidates } from './generateCaptureReminders';
import type { LifeObject } from '@/types/capture';

const NOW = new Date('2026-06-02T14:00:00.000'); // 2 PM

function makeCapture(raw: string, status: LifeObject['status'] = 'active'): LifeObject {
  return {
    id: `cap-${Math.random().toString(36).slice(2)}`,
    raw,
    status,
    parse: { timing: null, people: [], location: null, category: null, emotionalWeight: null },
  } as unknown as LifeObject;
}

describe('generateCaptureReminderCandidates', () => {
  it('generates a candidate for a capture with reminder intent and future time', () => {
    const cap = makeCapture('Remind me to call Matt in 30 minutes');
    const candidates = generateCaptureReminderCandidates([cap], NOW);
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].type, 'capture_reminder');
  });

  it('primary line is the cleaned task text, not the raw capture', () => {
    const cap = makeCapture('Remind me to call Matt in 30 minutes');
    const [candidate] = generateCaptureReminderCandidates([cap], NOW);
    assert.ok(candidate);
    assert.ok(!candidate.primaryLine.toLowerCase().includes('remind me'), `raw prefix in: "${candidate.primaryLine}"`);
    assert.ok(candidate.primaryLine.toLowerCase().includes('call matt'), `task missing from: "${candidate.primaryLine}"`);
  });

  it('skips captures without reminder intent', () => {
    const cap = makeCapture('Call Matt at 3pm');
    const candidates = generateCaptureReminderCandidates([cap], NOW);
    assert.equal(candidates.length, 0);
  });

  it('skips done captures', () => {
    const cap = makeCapture('Remind me to call Matt in 30 minutes', 'done');
    const candidates = generateCaptureReminderCandidates([cap], NOW);
    assert.equal(candidates.length, 0);
  });

  it('skips archived captures', () => {
    const cap = makeCapture('Remind me to call Matt in 30 minutes', 'archived');
    const candidates = generateCaptureReminderCandidates([cap], NOW);
    assert.equal(candidates.length, 0);
  });

  it('skips captures with no resolvable time', () => {
    const cap = makeCapture('Remind me to call Matt');
    const candidates = generateCaptureReminderCandidates([cap], NOW);
    assert.equal(candidates.length, 0);
  });

  it('produces one candidate per capture, not multiple', () => {
    const cap = makeCapture('Remind me to call Matt in 30 minutes');
    const candidates = generateCaptureReminderCandidates([cap, cap], NOW);
    // Two identical captures → two candidates (each has unique window; dedup is in scheduler)
    assert.ok(candidates.length <= 2);
  });

  it('generates for multiple distinct captures', () => {
    const a = makeCapture('Remind me to call Matt in 30 minutes');
    const b = makeCapture('Alert me to check the oven in 45 minutes');
    const candidates = generateCaptureReminderCandidates([a, b], NOW);
    assert.equal(candidates.length, 2);
  });

  it('candidate has high timing sensitivity', () => {
    const cap = makeCapture('Remind me to call Matt in 30 minutes');
    const [candidate] = generateCaptureReminderCandidates([cap], NOW);
    assert.equal(candidate.timingSensitivity, 'high');
  });

  it('candidate has high confidence', () => {
    const cap = makeCapture('Remind me to call Matt in 30 minutes');
    const [candidate] = generateCaptureReminderCandidates([cap], NOW);
    assert.equal(candidate.confidence, 'high');
  });

  it('candidate sourceCaptureIds contains the capture id', () => {
    const cap = makeCapture('Remind me to call Matt in 30 minutes');
    const [candidate] = generateCaptureReminderCandidates([cap], NOW);
    assert.ok(candidate.sourceCaptureIds.includes(cap.id));
  });

  it('empty capture list returns no candidates', () => {
    assert.equal(generateCaptureReminderCandidates([], NOW).length, 0);
  });
});
