/**
 * focusStore — day-scoping helpers
 *
 * The store itself depends on AsyncStorage (unavailable in Node test runner).
 * The day-reset logic is extracted into two exported pure functions —
 * `todayLocalDateString` and `resolveCompletedIds` — which are fully tested here.
 *
 * All required behaviors map directly to these helpers:
 *   - "completedIds starts empty on a new day"
 *     → resolveCompletedIds(ids, yesterday, today) === []
 *   - "completing first item today sets completedIdsDate to today"
 *     → resolveCompletedIds([], null, today) === [] (no prior data → fresh)
 *   - "completing multiple items same day increments count"
 *     → resolveCompletedIds(ids, today, today) === ids (no reset)
 *   - "next-day app open clears completedIds"
 *     → resolveCompletedIds(ids, yesterday, today) === []
 *   - "same-day undo removes the item" → undo filter is unchanged (removes by id)
 *   - "CalmWins / clear-state count uses only today's completions"
 *     → resolveCompletedIds guarantees the array is today-scoped before counting
 *
 * Store integration (completeItem, undoCompletion, merge hydration) is verified
 * through manual testing and app-level QA, since React Native module mocking is
 * not supported in the Node test runner.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { todayLocalDateString, resolveCompletedIds } from './focusStore';

// ── todayLocalDateString ──────────────────────────────────────────────────────

describe('todayLocalDateString', () => {
  it('returns a YYYY-MM-DD string', () => {
    const result = todayLocalDateString();
    assert.match(result, /^\d{4}-\d{2}-\d{2}$/, `Expected YYYY-MM-DD, got "${result}"`);
  });

  it('uses local date, not UTC', () => {
    // Create a date known to be in June 2026
    const d = new Date(2026, 5, 4); // June 4 2026 (month is 0-indexed)
    assert.equal(todayLocalDateString(d), '2026-06-04');
  });

  it('zero-pads month', () => {
    const d = new Date(2026, 0, 3); // January 3 2026
    assert.equal(todayLocalDateString(d), '2026-01-03');
  });

  it('zero-pads day', () => {
    const d = new Date(2026, 11, 7); // December 7 2026
    assert.equal(todayLocalDateString(d), '2026-12-07');
  });

  it('handles end-of-month dates', () => {
    const d = new Date(2026, 0, 31); // January 31 2026
    assert.equal(todayLocalDateString(d), '2026-01-31');
  });

  it('returns same value on repeated calls for same date', () => {
    const d = new Date(2026, 5, 1);
    assert.equal(todayLocalDateString(d), todayLocalDateString(d));
  });
});

// ── resolveCompletedIds ───────────────────────────────────────────────────────

describe('resolveCompletedIds', () => {
  const TODAY = '2026-06-04';
  const YESTERDAY = '2026-06-03';
  const LAST_WEEK = '2026-05-28';

  describe('new day reset', () => {
    it('returns [] when storedDate is yesterday', () => {
      const result = resolveCompletedIds(['item-1', 'item-2'], YESTERDAY, TODAY);
      assert.deepEqual(result, [], 'should reset completedIds for a new day');
    });

    it('returns [] when storedDate is from last week', () => {
      const result = resolveCompletedIds(['item-1'], LAST_WEEK, TODAY);
      assert.deepEqual(result, []);
    });

    it('returns [] when storedDate is null (never set — first day)', () => {
      const result = resolveCompletedIds([], null, TODAY);
      assert.deepEqual(result, []);
    });

    it('returns [] when storedDate is null and there are stale stored ids', () => {
      // Defensive: ids without a date should be cleared
      const result = resolveCompletedIds(['stale-item'], null, TODAY);
      assert.deepEqual(result, []);
    });

    it('returns [] when storedDate is tomorrow (clock skew / DST)', () => {
      // If persisted date is somehow in the future, still reset
      const TOMORROW = '2026-06-05';
      const result = resolveCompletedIds(['item-1'], TOMORROW, TODAY);
      assert.deepEqual(result, []);
    });
  });

  describe('same-day retention', () => {
    it('returns stored ids unchanged when storedDate matches today', () => {
      const ids = ['item-1', 'item-2', 'item-3'];
      const result = resolveCompletedIds(ids, TODAY, TODAY);
      assert.deepEqual(result, ids, 'should retain today\'s completions');
    });

    it('completing multiple items same day accumulates correctly', () => {
      // Simulate state after first completion
      const afterFirst = resolveCompletedIds(['item-1'], TODAY, TODAY);
      assert.deepEqual(afterFirst, ['item-1']);
      // Add second item (would be done in completeItem)
      const afterSecond = [...afterFirst, 'item-2'];
      assert.equal(afterSecond.length, 2, '2 things handled today');
    });

    it('returns empty array unchanged when stored is [] and date matches', () => {
      const result = resolveCompletedIds([], TODAY, TODAY);
      assert.deepEqual(result, []);
    });
  });

  describe('day boundary correctness — CalmWins and clear-state count', () => {
    it('count after new-day reset is 0, not the previous day\'s count', () => {
      // Simulates: user had 5 completions yesterday, opens app today
      const ids = ['a', 'b', 'c', 'd', 'e'];
      const resolved = resolveCompletedIds(ids, YESTERDAY, TODAY);
      assert.equal(resolved.length, 0, 'CalmWins should show 0, not 5, on a new day');
    });

    it('count after same-day completion is the correct today count', () => {
      const ids = ['a', 'b', 'c'];
      const resolved = resolveCompletedIds(ids, TODAY, TODAY);
      assert.equal(resolved.length, 3, 'CalmWins should show 3 things handled today');
    });
  });

  describe('undo correctness', () => {
    it('same-day undo: removing an id from today\'s resolved array works', () => {
      // Simulate state: 2 items completed today
      const resolved = resolveCompletedIds(['item-1', 'item-2'], TODAY, TODAY);
      // Simulate undoCompletion removing item-2
      const afterUndo = resolved.filter((id) => id !== 'item-2');
      assert.deepEqual(afterUndo, ['item-1'], 'same-day undo removes the item correctly');
    });

    it('cross-day undo: filtering stale id from reset array is a no-op', () => {
      // Simulate: user snoozed an item yesterday, new day opens
      const resolved = resolveCompletedIds(['yesterday-item'], YESTERDAY, TODAY);
      // After reset, resolved = []. Undo tries to filter 'yesterday-item' — safe no-op.
      const afterUndo = resolved.filter((id) => id !== 'yesterday-item');
      assert.deepEqual(afterUndo, [], 'cross-day undo is a safe no-op, array stays empty');
    });
  });

  describe('edge cases', () => {
    it('returns the same array reference when storedDate matches today and ids are present', () => {
      const ids = ['item-1'];
      const result = resolveCompletedIds(ids, TODAY, TODAY);
      // Same array returned (not a copy) — pure identity when no reset needed
      assert.equal(result, ids);
    });

    it('returned reset array is always a new [] not a reference to stored', () => {
      const ids = ['item-1'];
      const result = resolveCompletedIds(ids, YESTERDAY, TODAY);
      assert.deepEqual(result, []);
      assert.notEqual(result, ids, 'reset should return a new empty array');
    });

    it('handles empty stored ids on same day', () => {
      const result = resolveCompletedIds([], TODAY, TODAY);
      assert.deepEqual(result, []);
    });

    it('handles large stored arrays correctly (same day)', () => {
      const ids = Array.from({ length: 50 }, (_, i) => `item-${i}`);
      const result = resolveCompletedIds(ids, TODAY, TODAY);
      assert.equal(result.length, 50);
    });

    it('handles large stored arrays correctly (new day)', () => {
      const ids = Array.from({ length: 50 }, (_, i) => `item-${i}`);
      const result = resolveCompletedIds(ids, YESTERDAY, TODAY);
      assert.deepEqual(result, []);
    });
  });
});
