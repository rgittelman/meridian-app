/**
 * Phase B Lifecycle Validation — planNotificationReconciliation
 *
 * Validates the six reconciliation behaviors required by Phase B:
 *   1. Foreground reconcile — schedule_new for a newly approved bundle
 *   2. Calendar sync reconcile — cancel_stale when a previously scheduled bundle is no longer approved
 *   3. Record creation — schedule_new decision is emitted
 *   4. Duplicate prevention — no schedule_new when a matching record already exists
 *   5. Event move — bundle-id staleness triggers cancel_stale + schedule_new
 *   6. Event delete — bundle-id staleness triggers cancel_stale
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  planNotificationReconciliation,
  hasAlertTimingDrift,
  TIMING_DRIFT_THRESHOLD_MS,
} from './reconciliationPlan';
import type {
  ApprovedNotificationBundle,
  ScheduledNotificationRecord,
  NotificationDeliveryContext,
} from '@/types/notificationDelivery';
import { buildDeliveryDedupeKeyFromParts } from '@/types/notificationDelivery';
import { nanoid } from 'nanoid';

// ── Helpers ──────────────────────────────────────────────────────────────────

const FUTURE = new Date(Date.now() + 2 * 60 * 60 * 1000); // +2 h
const FUTURE_END = new Date(Date.now() + 3 * 60 * 60 * 1000); // +3 h
const PAST = new Date(Date.now() - 60 * 60 * 1000); // -1 h
const PAST_END = new Date(Date.now() - 30 * 60 * 1000); // -30 min

function makeBundle(overrides: Partial<ApprovedNotificationBundle> = {}): ApprovedNotificationBundle {
  const id = overrides.id ?? nanoid();
  const bundleKey = overrides.bundleKey ?? 'transition_awareness:morning';
  return {
    id,
    bundleKey,
    type: 'transition_awareness',
    candidateIds: [],
    title: 'Heads up',
    lines: ['You have a meeting at 10 am.'],
    decision: 'send',
    suppressionReason: null,
    interruptionReason: 'Upcoming commitment',
    targetWindowStart: FUTURE,
    targetWindowEnd: FUTURE_END,
    householdImpact: 'medium',
    interruptionScore: {
      total: 50,
      householdImpact: 10,
      timingSensitivity: 10,
      conflictRisk: 10,
      prepRelevance: 10,
      peopleImpact: 5,
      confidence: 5,
    },
    ...overrides,
  } as ApprovedNotificationBundle;
}

function makeRecord(
  bundle: ApprovedNotificationBundle,
  overrides: Partial<ScheduledNotificationRecord> = {},
): ScheduledNotificationRecord {
  const dedupeKey = buildDeliveryDedupeKeyFromParts({
    bundleId: bundle.id,
    bundleKey: bundle.bundleKey,
    sourceEventIds: [],
    targetWindowStart: bundle.targetWindowStart,
    targetWindowEnd: bundle.targetWindowEnd,
  });
  return {
    id: nanoid(),
    bundleId: bundle.id,
    bundleKey: bundle.bundleKey,
    candidateIds: bundle.candidateIds,
    notificationType: bundle.type,
    title: bundle.title,
    body: bundle.lines.join('\n'),
    scheduledFor: bundle.targetWindowStart,
    targetWindowStart: bundle.targetWindowStart,
    targetWindowEnd: bundle.targetWindowEnd,
    sourceEventIds: [],
    sourceCaptureIds: [],
    deliveryStatus: 'scheduled',
    dedupeKey,
    tapDestination: { screen: 'focus' },
    platformNotificationId: 'expo-id-' + nanoid(),
    cancellationReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const baseContext: NotificationDeliveryContext = {
  now: new Date(),
  lastAppOpenedAt: null,
  eventStartTimes: {},
  resolvedCaptureIds: new Set(),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Phase B: foreground reconcile — newly approved bundle', () => {
  it('emits schedule_new when no existing record matches the bundle', () => {
    const bundle = makeBundle();
    const decisions = planNotificationReconciliation({
      approvedBundles: [bundle],
      scheduledRecords: [],
      context: baseContext,
    });
    const action = decisions.find((d) => d.bundleId === bundle.id);
    assert.ok(action, 'expected a decision for the bundle');
    assert.equal(action.action, 'schedule_new');
  });
});

describe('Phase B: calendar sync reconcile — previously approved bundle removed', () => {
  it('emits cancel_stale when a scheduled record is no longer in the approved set', () => {
    const bundle = makeBundle();
    const record = makeRecord(bundle);
    // Simulate a sync where this bundle is no longer approved
    const decisions = planNotificationReconciliation({
      approvedBundles: [],
      scheduledRecords: [record],
      context: baseContext,
    });
    const action = decisions.find((d) => d.bundleId === bundle.id);
    assert.ok(action, 'expected a decision for the stale record');
    assert.equal(action.action, 'cancel_stale');
    assert.equal(action.recordId, record.id);
  });
});

describe('Phase B: record creation — schedule_new decision emitted', () => {
  it('emits exactly one schedule_new for a new bundle with no prior record', () => {
    const bundle = makeBundle();
    const decisions = planNotificationReconciliation({
      approvedBundles: [bundle],
      scheduledRecords: [],
      context: baseContext,
    });
    const schedules = decisions.filter((d) => d.action === 'schedule_new');
    assert.equal(schedules.length, 1);
    assert.equal(schedules[0].bundleId, bundle.id);
  });
});

describe('Phase B: duplicate prevention — no schedule_new when record already exists', () => {
  it('emits keep_existing and no schedule_new when a matching scheduled record exists', () => {
    const bundle = makeBundle();
    const record = makeRecord(bundle);
    const decisions = planNotificationReconciliation({
      approvedBundles: [bundle],
      scheduledRecords: [record],
      context: baseContext,
    });
    const schedules = decisions.filter((d) => d.action === 'schedule_new');
    assert.equal(schedules.length, 0, 'should not emit schedule_new when record exists');
    const kept = decisions.find((d) => d.action === 'keep_existing' && d.bundleId === bundle.id);
    assert.ok(kept, 'should emit keep_existing for existing record');
  });
});

describe('Phase B: event move — old bundle becomes stale, new bundle scheduled', () => {
  it('emits cancel_stale for the old record and schedule_new for the replacement bundle', () => {
    // Simulate: intelligence re-approved the event with a new bundle id
    // (the event moved, so targetWindowStart changed and a new bundle was generated).
    const oldBundle = makeBundle({ id: 'bundle-old', bundleKey: 'transition_awareness:old' });
    const oldRecord = makeRecord(oldBundle);

    const newBundle = makeBundle({ id: 'bundle-new', bundleKey: 'transition_awareness:new' });

    // Only the new bundle is in the approved set; old bundle no longer approved.
    const decisions = planNotificationReconciliation({
      approvedBundles: [newBundle],
      scheduledRecords: [oldRecord],
      context: baseContext,
    });

    const cancel = decisions.find((d) => d.bundleId === oldBundle.id);
    assert.ok(cancel, 'expected a decision for the old bundle');
    assert.equal(cancel.action, 'cancel_stale', 'old record should be cancelled');

    const schedule = decisions.find((d) => d.bundleId === newBundle.id);
    assert.ok(schedule, 'expected a decision for the new bundle');
    assert.equal(schedule.action, 'schedule_new', 'new bundle should be scheduled');
  });
});

describe('Phase B: event delete — bundle removed from approved set', () => {
  it('emits cancel_stale for a scheduled record whose bundle is no longer approved', () => {
    const bundle = makeBundle();
    const record = makeRecord(bundle);
    // Simulate: the calendar event was deleted, so no bundles are approved.
    const decisions = planNotificationReconciliation({
      approvedBundles: [],
      scheduledRecords: [record],
      context: baseContext,
    });
    const cancel = decisions.find((d) => d.bundleId === bundle.id);
    assert.ok(cancel, 'expected a cancellation decision');
    assert.equal(cancel.action, 'cancel_stale');
    assert.equal(cancel.reason, 'Bundle no longer approved');
  });
});

describe('Phase B: window expiry — passed records are expired, not cancelled', () => {
  it('emits expire_passed for a record whose delivery window has passed', () => {
    const bundle = makeBundle({ targetWindowStart: PAST, targetWindowEnd: PAST_END });
    const record = makeRecord(bundle, {
      scheduledFor: PAST,
      targetWindowStart: PAST,
      targetWindowEnd: PAST_END,
    });
    const decisions = planNotificationReconciliation({
      approvedBundles: [],
      scheduledRecords: [record],
      context: baseContext,
    });
    const action = decisions.find((d) => d.bundleId === bundle.id);
    assert.ok(action);
    assert.equal(action.action, 'expire_passed');
  });
});

// ── Phase H.2: hasAlertTimingDrift (pure helper) ─────────────────────────────

describe('hasAlertTimingDrift — pure helper', () => {
  const BASE_TIME = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const THRESHOLD = TIMING_DRIFT_THRESHOLD_MS;

  function makeRecordWithWindow(windowStart: Date) {
    const b = makeBundle({ targetWindowStart: windowStart });
    return makeRecord(b, { targetWindowStart: windowStart });
  }

  it('returns false when record and bundle have identical targetWindowStart', () => {
    const bundle = makeBundle({ targetWindowStart: BASE_TIME });
    const record = makeRecord(bundle, { targetWindowStart: BASE_TIME });
    assert.equal(hasAlertTimingDrift(record, bundle), false);
  });

  it('returns false when drift is within the threshold', () => {
    const bundle = makeBundle({ targetWindowStart: new Date(BASE_TIME.getTime() + THRESHOLD - 1) });
    const record = makeRecordWithWindow(BASE_TIME);
    assert.equal(hasAlertTimingDrift(record, bundle), false);
  });

  it('returns false when drift is exactly at the threshold boundary', () => {
    const bundle = makeBundle({ targetWindowStart: new Date(BASE_TIME.getTime() + THRESHOLD) });
    const record = makeRecordWithWindow(BASE_TIME);
    // Strictly greater than threshold required — boundary does not trigger
    assert.equal(hasAlertTimingDrift(record, bundle), false);
  });

  it('returns true when drift exceeds the threshold (alert moved later)', () => {
    const bundle = makeBundle({ targetWindowStart: new Date(BASE_TIME.getTime() + THRESHOLD + 1) });
    const record = makeRecordWithWindow(BASE_TIME);
    assert.equal(hasAlertTimingDrift(record, bundle), true);
  });

  it('returns true when drift exceeds the threshold (alert moved earlier)', () => {
    const bundle = makeBundle({ targetWindowStart: new Date(BASE_TIME.getTime() - THRESHOLD - 1) });
    const record = makeRecordWithWindow(BASE_TIME);
    assert.equal(hasAlertTimingDrift(record, bundle), true);
  });

  it('respects a custom threshold', () => {
    const twoMinMs = 2 * 60 * 1000;
    const bundle = makeBundle({ targetWindowStart: new Date(BASE_TIME.getTime() + twoMinMs + 1) });
    const record = makeRecordWithWindow(BASE_TIME);
    assert.equal(hasAlertTimingDrift(record, bundle, twoMinMs), true);
    assert.equal(hasAlertTimingDrift(record, bundle, THRESHOLD), false);
  });
});

// ── Phase H.2: timing drift in full reconciliation ───────────────────────────

describe('Phase H.2: timing drift reschedule in planNotificationReconciliation', () => {
  it('emits reschedule_changed when bundle targetWindowStart drifts beyond threshold', () => {
    const originalWindow = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const driftedWindow = new Date(originalWindow.getTime() + TIMING_DRIFT_THRESHOLD_MS + 60_000);

    const bundle = makeBundle({ targetWindowStart: driftedWindow, targetWindowEnd: new Date(driftedWindow.getTime() + 5 * 60_000) });
    // Existing record was scheduled at the original (now stale) window
    const record = makeRecord(
      makeBundle({ id: bundle.id, bundleKey: bundle.bundleKey, targetWindowStart: originalWindow }),
      { bundleId: bundle.id, targetWindowStart: originalWindow },
    );

    const decisions = planNotificationReconciliation({
      approvedBundles: [bundle],
      scheduledRecords: [record],
      context: baseContext,
    });

    const action = decisions.find((d) => d.bundleId === bundle.id && d.recordId === record.id);
    assert.ok(action, 'expected a decision for the drifted record');
    assert.equal(action.action, 'reschedule_changed');
    assert.ok(action.reason?.includes('timing drift'), `expected timing drift reason, got: "${action.reason}"`);
  });

  it('emits keep_existing when timing drift is within threshold', () => {
    const originalWindow = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const smallDrift = new Date(originalWindow.getTime() + 60_000); // 1 min — below 5-min threshold

    const bundle = makeBundle({ targetWindowStart: smallDrift, targetWindowEnd: new Date(smallDrift.getTime() + 5 * 60_000) });
    const record = makeRecord(
      makeBundle({ id: bundle.id, bundleKey: bundle.bundleKey, targetWindowStart: originalWindow }),
      { bundleId: bundle.id, targetWindowStart: originalWindow },
    );

    const decisions = planNotificationReconciliation({
      approvedBundles: [bundle],
      scheduledRecords: [record],
      context: baseContext,
    });

    const action = decisions.find((d) => d.bundleId === bundle.id);
    assert.ok(action, 'expected a decision');
    assert.equal(action.action, 'keep_existing', `expected keep_existing for small drift, got: ${action.action}`);
  });
});
