import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  tapDestinationToTab,
  extractTapDestination,
  handleNotificationTap,
} from './handleNotificationTap';

// ── tapDestinationToTab ───────────────────────────────────────────────────────

describe('tapDestinationToTab', () => {
  it('focus destination → Focus tab', () => {
    assert.equal(tapDestinationToTab({ screen: 'focus' }), 'Focus');
  });

  it('plan destination → Plan tab', () => {
    assert.equal(tapDestinationToTab({ screen: 'plan' }), 'Plan');
  });

  it('event_detail destination → Plan tab (detail screen deferred)', () => {
    assert.equal(
      tapDestinationToTab({ screen: 'event_detail', eventId: 'evt-123' }),
      'Plan',
    );
  });

  it('capture_detail destination → Capture tab (detail screen deferred)', () => {
    assert.equal(
      tapDestinationToTab({ screen: 'capture_detail', captureId: 'cap-456' }),
      'Capture',
    );
  });
});

// ── extractTapDestination ─────────────────────────────────────────────────────

describe('extractTapDestination', () => {
  it('returns null for non-Meridian notifications (missing meridianManaged)', () => {
    assert.equal(extractTapDestination({}), null);
  });

  it('returns null when meridianManaged is false', () => {
    assert.equal(extractTapDestination({ meridianManaged: false }), null);
  });

  it('returns null when meridianManaged is true but tapDestination is missing', () => {
    assert.equal(extractTapDestination({ meridianManaged: true }), null);
  });

  it('returns null when tapDestination is not an object', () => {
    assert.equal(
      extractTapDestination({ meridianManaged: true, tapDestination: 'focus' }),
      null,
    );
  });

  it('extracts focus destination', () => {
    const result = extractTapDestination({
      meridianManaged: true,
      tapDestination: { screen: 'focus' },
    });
    assert.deepEqual(result, { screen: 'focus' });
  });

  it('extracts plan destination', () => {
    const result = extractTapDestination({
      meridianManaged: true,
      tapDestination: { screen: 'plan' },
    });
    assert.deepEqual(result, { screen: 'plan' });
  });

  it('extracts event_detail destination with eventId', () => {
    const result = extractTapDestination({
      meridianManaged: true,
      tapDestination: { screen: 'event_detail', eventId: 'evt-123' },
    });
    assert.deepEqual(result, { screen: 'event_detail', eventId: 'evt-123' });
  });

  it('falls back to focus when event_detail is missing eventId', () => {
    const result = extractTapDestination({
      meridianManaged: true,
      tapDestination: { screen: 'event_detail' },
    });
    assert.deepEqual(result, { screen: 'focus' });
  });

  it('extracts capture_detail destination with captureId', () => {
    const result = extractTapDestination({
      meridianManaged: true,
      tapDestination: { screen: 'capture_detail', captureId: 'cap-456' },
    });
    assert.deepEqual(result, { screen: 'capture_detail', captureId: 'cap-456' });
  });

  it('falls back to focus when capture_detail is missing captureId', () => {
    const result = extractTapDestination({
      meridianManaged: true,
      tapDestination: { screen: 'capture_detail' },
    });
    assert.deepEqual(result, { screen: 'focus' });
  });

  it('falls back to focus for unrecognised screen value', () => {
    const result = extractTapDestination({
      meridianManaged: true,
      tapDestination: { screen: 'unknown_future_screen' },
    });
    assert.deepEqual(result, { screen: 'focus' });
  });

  it('returns null for a third-party SDK notification payload', () => {
    // Simulates a Firebase / OneSignal payload that has no meridianManaged key
    const result = extractTapDestination({
      gcm_notification: { body: 'some push' },
      from: 'firebase',
    });
    assert.equal(result, null);
  });
});

// ── handleNotificationTap — deduplication guard ───────────────────────────────

describe('handleNotificationTap deduplication', () => {
  // Minimal nav stub — tracks navigate calls
  function makeNav() {
    const calls: string[] = [];
    return {
      isReady: () => true,
      navigate: (name: string) => { calls.push(name); },
      calls,
    };
  }

  it('navigates on first call with a given notificationId', () => {
    const nav = makeNav();
    handleNotificationTap({ screen: 'plan' }, nav, 'notif-abc');
    assert.equal(nav.calls.length, 1);
    assert.equal(nav.calls[0], 'Plan');
  });

  it('ignores a second call with the same notificationId', () => {
    const nav = makeNav();
    handleNotificationTap({ screen: 'plan' }, nav, 'notif-dedup-1');
    handleNotificationTap({ screen: 'focus' }, nav, 'notif-dedup-1');
    assert.equal(nav.calls.length, 1, 'second call with same id should be ignored');
    assert.equal(nav.calls[0], 'Plan');
  });

  it('navigates again with a different notificationId', () => {
    const nav = makeNav();
    handleNotificationTap({ screen: 'plan' }, nav, 'notif-x1');
    handleNotificationTap({ screen: 'focus' }, nav, 'notif-x2');
    assert.equal(nav.calls.length, 2);
    assert.equal(nav.calls[0], 'Plan');
    assert.equal(nav.calls[1], 'Focus');
  });

  it('navigates without deduplication when notificationId is omitted', () => {
    const nav = makeNav();
    handleNotificationTap({ screen: 'focus' }, nav);
    handleNotificationTap({ screen: 'plan' }, nav);
    assert.equal(nav.calls.length, 2, 'no id = no dedup guard');
  });
});
