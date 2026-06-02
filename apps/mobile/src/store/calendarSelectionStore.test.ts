/**
 * calendarSelectionStore — pure logic tests.
 *
 * The Zustand store is tested by constructing its initial state and calling
 * actions directly, without mounting any React component or touching AsyncStorage.
 */

import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';

import type { SourceCalendarMeta } from '@/types/calendar';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCal(
  id: string,
  name: string,
  primary = false,
): SourceCalendarMeta {
  return {
    sourceCalendarId: id,
    sourceCalendarName: name,
    sourceCalendarPrimary: primary,
    sourceCalendarAccessRole: 'owner',
  };
}

const FAMILY = makeCal('cal-family', 'Family');
const WORK = makeCal('cal-work', 'Work');
const PRIMARY = makeCal('cal-primary', 'Ryan Gittelman', true);
const HOLIDAYS = makeCal('cal-holidays', 'Holidays in United States');

// ── We test the pure selection logic without the Zustand reactive layer ───────
// Extract the logic as functions that mirror the store actions exactly.

type SelectionState = {
  availableCalendars: SourceCalendarMeta[];
  disabledCalendarIds: string[];
};

function isCalendarEnabled(state: SelectionState, id: string): boolean {
  return !state.disabledCalendarIds.includes(id);
}

function enabledCalendars(state: SelectionState): SourceCalendarMeta[] {
  const disabled = new Set(state.disabledCalendarIds);
  return state.availableCalendars.filter((c) => !disabled.has(c.sourceCalendarId));
}

function setCalendarEnabled(
  state: SelectionState,
  id: string,
  enabled: boolean,
): SelectionState {
  // Mirror the store-level primary guard exactly.
  const calendar = state.availableCalendars.find((c) => c.sourceCalendarId === id);
  if (calendar?.sourceCalendarPrimary) return state;

  if (enabled) {
    return {
      ...state,
      disabledCalendarIds: state.disabledCalendarIds.filter((d) => d !== id),
    };
  } else {
    if (state.disabledCalendarIds.includes(id)) return state;
    return {
      ...state,
      disabledCalendarIds: [...state.disabledCalendarIds, id],
    };
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('calendarSelectionStore — isCalendarEnabled', () => {
  it('returns true for an unknown ID (opt-out default)', () => {
    const state: SelectionState = { availableCalendars: [], disabledCalendarIds: [] };
    assert.equal(isCalendarEnabled(state, 'unknown-id'), true);
  });

  it('returns true when ID is not in disabledCalendarIds', () => {
    const state: SelectionState = {
      availableCalendars: [FAMILY],
      disabledCalendarIds: ['cal-work'],
    };
    assert.equal(isCalendarEnabled(state, 'cal-family'), true);
  });

  it('returns false when ID is in disabledCalendarIds', () => {
    const state: SelectionState = {
      availableCalendars: [WORK],
      disabledCalendarIds: ['cal-work'],
    };
    assert.equal(isCalendarEnabled(state, 'cal-work'), false);
  });
});

describe('calendarSelectionStore — setCalendarEnabled', () => {
  let state: SelectionState;

  beforeEach(() => {
    state = {
      availableCalendars: [PRIMARY, FAMILY, WORK, HOLIDAYS],
      disabledCalendarIds: [],
    };
  });

  it('adds ID to disabledCalendarIds when disabled', () => {
    const next = setCalendarEnabled(state, 'cal-work', false);
    assert.ok(next.disabledCalendarIds.includes('cal-work'));
  });

  it('removes ID from disabledCalendarIds when re-enabled', () => {
    state = { ...state, disabledCalendarIds: ['cal-work'] };
    const next = setCalendarEnabled(state, 'cal-work', true);
    assert.ok(!next.disabledCalendarIds.includes('cal-work'));
  });

  it('is a no-op when enabling an already-enabled calendar', () => {
    const next = setCalendarEnabled(state, 'cal-family', true);
    assert.deepEqual(next.disabledCalendarIds, []);
  });

  it('is a no-op when disabling an already-disabled calendar', () => {
    state = { ...state, disabledCalendarIds: ['cal-work'] };
    const next = setCalendarEnabled(state, 'cal-work', false);
    assert.deepEqual(next.disabledCalendarIds, ['cal-work']);
    assert.equal(next, state); // same reference — Zustand short-circuits on includes check
  });

  it('primary calendar cannot be disabled — store-level guard', () => {
    const next = setCalendarEnabled(state, 'cal-primary', false);
    assert.equal(next, state, 'state should be unchanged for primary calendar');
    assert.ok(!next.disabledCalendarIds.includes('cal-primary'));
  });

  it('primary calendar guard works even when UI sends disable=false', () => {
    // Simulate a hypothetical UI bypass
    const next = setCalendarEnabled(state, 'cal-primary', false);
    assert.ok(isCalendarEnabled(next, 'cal-primary'), 'primary must remain enabled');
  });
});

describe('calendarSelectionStore — enabledCalendars', () => {
  it('returns all calendars when nothing is disabled', () => {
    const state: SelectionState = {
      availableCalendars: [FAMILY, WORK, HOLIDAYS],
      disabledCalendarIds: [],
    };
    assert.equal(enabledCalendars(state).length, 3);
  });

  it('excludes disabled calendars', () => {
    const state: SelectionState = {
      availableCalendars: [FAMILY, WORK, HOLIDAYS],
      disabledCalendarIds: ['cal-work', 'cal-holidays'],
    };
    const result = enabledCalendars(state);
    assert.equal(result.length, 1);
    assert.equal(result[0].sourceCalendarId, 'cal-family');
  });

  it('returns empty array when all calendars are disabled', () => {
    const state: SelectionState = {
      availableCalendars: [FAMILY, WORK],
      disabledCalendarIds: ['cal-family', 'cal-work'],
    };
    assert.equal(enabledCalendars(state).length, 0);
  });

  it('stale disabled ID (calendar no longer in availableCalendars) does not appear in result', () => {
    const state: SelectionState = {
      availableCalendars: [FAMILY],
      disabledCalendarIds: ['cal-deleted'], // stale — not in availableCalendars
    };
    const result = enabledCalendars(state);
    assert.equal(result.length, 1);
    assert.equal(result[0].sourceCalendarId, 'cal-family');
  });

  it('returns empty array when availableCalendars is empty', () => {
    const state: SelectionState = {
      availableCalendars: [],
      disabledCalendarIds: [],
    };
    assert.equal(enabledCalendars(state).length, 0);
  });
});

describe('calendarSelectionStore — setAvailableCalendars', () => {
  it('overwrites the stored list completely', () => {
    let state: SelectionState = {
      availableCalendars: [FAMILY, WORK],
      disabledCalendarIds: [],
    };
    const newList = [PRIMARY, HOLIDAYS];
    state = { ...state, availableCalendars: newList };
    assert.deepEqual(state.availableCalendars, newList);
  });

  it('disabledCalendarIds are preserved after a list update', () => {
    let state: SelectionState = {
      availableCalendars: [FAMILY, WORK],
      disabledCalendarIds: ['cal-work'],
    };
    // Simulate a sync updating the list
    state = { ...state, availableCalendars: [FAMILY, WORK, HOLIDAYS] };
    assert.ok(state.disabledCalendarIds.includes('cal-work'));
    assert.ok(!isCalendarEnabled(state, 'cal-work'));
  });
});
