import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { shouldDeliverBundleForSettings } from './notificationSettingsFilter';

const ALL_ENABLED = {
  morningBriefEnabled: true,
  eveningPreviewEnabled: true,
  beforeEventsEnabled: true,
  criticalAlertsEnabled: true,
};

const ALL_DISABLED = {
  morningBriefEnabled: false,
  eveningPreviewEnabled: false,
  beforeEventsEnabled: false,
  criticalAlertsEnabled: false,
};

describe('shouldDeliverBundleForSettings', () => {
  it('allows morning_brief when enabled', () => {
    assert.equal(shouldDeliverBundleForSettings('morning_brief', ALL_ENABLED), true);
  });

  it('blocks morning_brief when disabled', () => {
    assert.equal(shouldDeliverBundleForSettings('morning_brief', ALL_DISABLED), false);
  });

  it('allows evening_wind_down when enabled', () => {
    assert.equal(shouldDeliverBundleForSettings('evening_wind_down', ALL_ENABLED), true);
  });

  it('blocks evening_wind_down when disabled', () => {
    assert.equal(shouldDeliverBundleForSettings('evening_wind_down', ALL_DISABLED), false);
  });

  it('allows transition_awareness when enabled', () => {
    assert.equal(shouldDeliverBundleForSettings('transition_awareness', ALL_ENABLED), true);
  });

  it('blocks transition_awareness when disabled', () => {
    assert.equal(shouldDeliverBundleForSettings('transition_awareness', ALL_DISABLED), false);
  });

  it('allows critical_commitment_protection when enabled', () => {
    assert.equal(
      shouldDeliverBundleForSettings('critical_commitment_protection', ALL_ENABLED),
      true,
    );
  });

  it('blocks critical_commitment_protection when disabled', () => {
    assert.equal(
      shouldDeliverBundleForSettings('critical_commitment_protection', ALL_DISABLED),
      false,
    );
  });

  it('allows leave_alert when beforeEventsEnabled is true', () => {
    assert.equal(shouldDeliverBundleForSettings('leave_alert', ALL_ENABLED), true);
  });

  it('blocks leave_alert when beforeEventsEnabled is false', () => {
    assert.equal(
      shouldDeliverBundleForSettings('leave_alert', { ...ALL_ENABLED, beforeEventsEnabled: false }),
      false,
    );
  });

  it('allows all types when all settings are enabled', () => {
    const types = [
      'morning_brief',
      'evening_wind_down',
      'transition_awareness',
      'critical_commitment_protection',
      'leave_alert',
    ] as const;
    for (const type of types) {
      assert.equal(
        shouldDeliverBundleForSettings(type, ALL_ENABLED),
        true,
        `${type} should be allowed when all enabled`,
      );
    }
  });

  it('blocks all types when all settings are disabled', () => {
    const types = [
      'morning_brief',
      'evening_wind_down',
      'transition_awareness',
      'critical_commitment_protection',
      'leave_alert',
    ] as const;
    for (const type of types) {
      assert.equal(
        shouldDeliverBundleForSettings(type, ALL_DISABLED),
        false,
        `${type} should be blocked when all disabled`,
      );
    }
  });

  it('each toggle independently controls its type', () => {
    assert.equal(
      shouldDeliverBundleForSettings('morning_brief', { ...ALL_ENABLED, morningBriefEnabled: false }),
      false,
    );
    assert.equal(
      shouldDeliverBundleForSettings('evening_wind_down', { ...ALL_ENABLED, eveningPreviewEnabled: false }),
      false,
    );
    assert.equal(
      shouldDeliverBundleForSettings('transition_awareness', { ...ALL_ENABLED, beforeEventsEnabled: false }),
      false,
    );
    assert.equal(
      shouldDeliverBundleForSettings('critical_commitment_protection', {
        ...ALL_ENABLED,
        criticalAlertsEnabled: false,
      }),
      false,
    );
  });

  it('disabling one type does not block others', () => {
    const settings = { ...ALL_ENABLED, morningBriefEnabled: false };
    assert.equal(shouldDeliverBundleForSettings('evening_wind_down', settings), true);
    assert.equal(shouldDeliverBundleForSettings('transition_awareness', settings), true);
    assert.equal(shouldDeliverBundleForSettings('critical_commitment_protection', settings), true);
  });
});
