import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildTrafficCacheKey,
  formatEventDate,
  HEAVY_TRAFFIC_THRESHOLD_MINUTES,
  isHeavierTraffic,
  isTrafficEstimateStale,
  TRAFFIC_CACHE_TTL_MS,
  type TrafficCacheEntry,
} from './trafficIntelligence';

// ── formatEventDate ───────────────────────────────────────────────────────────

describe('formatEventDate', () => {
  it('formats a date to YYYY-MM-DD', () => {
    assert.equal(formatEventDate(new Date('2026-06-15T14:00:00')), '2026-06-15');
  });

  it('zero-pads month and day', () => {
    assert.equal(formatEventDate(new Date('2026-01-05T09:00:00')), '2026-01-05');
  });

  it('is stable — same date produces same output', () => {
    const d = new Date('2026-06-02T10:00:00');
    assert.equal(formatEventDate(d), formatEventDate(d));
  });
});

// ── buildTrafficCacheKey ──────────────────────────────────────────────────────

describe('buildTrafficCacheKey', () => {
  it('produces a deterministic key from coordinates and date', () => {
    const k1 = buildTrafficCacheKey(39.9042, -74.9929, 39.8765, -74.9123, '2026-06-15');
    const k2 = buildTrafficCacheKey(39.9042, -74.9929, 39.8765, -74.9123, '2026-06-15');
    assert.equal(k1, k2);
  });

  it('different dates produce different keys', () => {
    const k1 = buildTrafficCacheKey(39.9042, -74.9929, 39.8765, -74.9123, '2026-06-15');
    const k2 = buildTrafficCacheKey(39.9042, -74.9929, 39.8765, -74.9123, '2026-06-16');
    assert.notEqual(k1, k2);
  });

  it('different destinations produce different keys', () => {
    const k1 = buildTrafficCacheKey(39.9042, -74.9929, 39.8765, -74.9123, '2026-06-15');
    const k2 = buildTrafficCacheKey(39.9042, -74.9929, 39.9526, -75.1652, '2026-06-15');
    assert.notEqual(k1, k2);
  });

  it('different origins produce different keys', () => {
    const k1 = buildTrafficCacheKey(39.9042, -74.9929, 39.8765, -74.9123, '2026-06-15');
    const k2 = buildTrafficCacheKey(39.9526, -75.1652, 39.8765, -74.9123, '2026-06-15');
    assert.notEqual(k1, k2);
  });

  it('rounds coordinates to 4 decimal places', () => {
    const k1 = buildTrafficCacheKey(39.90421, -74.99291, 39.8765, -74.9123, '2026-06-15');
    const k2 = buildTrafficCacheKey(39.90424, -74.99294, 39.8765, -74.9123, '2026-06-15');
    // Both round to 39.9042, -74.9929 — same key
    assert.equal(k1, k2);
  });
});

// ── isTrafficEstimateStale ────────────────────────────────────────────────────

describe('isTrafficEstimateStale', () => {
  const NOW = Date.now();

  const freshEntry: TrafficCacheEntry = {
    cacheKey: 'key',
    eventId: 'e1',
    baselineMinutes: 20,
    trafficMinutes: 22,
    fetchedAt: NOW - 60_000, // 1 minute ago
  };

  it('undefined entry → stale', () => {
    assert.equal(isTrafficEstimateStale(undefined, NOW), true);
  });

  it('entry within TTL → not stale', () => {
    assert.equal(isTrafficEstimateStale(freshEntry, NOW), false);
  });

  it('entry at exactly TTL boundary → stale', () => {
    const atBoundary: TrafficCacheEntry = { ...freshEntry, fetchedAt: NOW - TRAFFIC_CACHE_TTL_MS };
    assert.equal(isTrafficEstimateStale(atBoundary, NOW), true);
  });

  it('entry past TTL → stale', () => {
    const old: TrafficCacheEntry = {
      ...freshEntry,
      fetchedAt: NOW - (TRAFFIC_CACHE_TTL_MS + 5000),
    };
    assert.equal(isTrafficEstimateStale(old, NOW), true);
  });

  it('respects a custom TTL', () => {
    // Fresh within 30 min default TTL but stale within a 30-second custom TTL
    const entry: TrafficCacheEntry = { ...freshEntry, fetchedAt: NOW - 60_000 };
    assert.equal(isTrafficEstimateStale(entry, NOW, 30_000), true);
    assert.equal(isTrafficEstimateStale(entry, NOW, TRAFFIC_CACHE_TTL_MS), false);
  });
});

// ── isHeavierTraffic ──────────────────────────────────────────────────────────

describe('isHeavierTraffic', () => {
  it('returns true when traffic exceeds baseline by more than threshold', () => {
    // 20 baseline + 6 = 26 — exceeds 5-min threshold
    assert.equal(isHeavierTraffic(20, 26), true);
  });

  it('returns false when traffic exceeds baseline by exactly the threshold', () => {
    // 20 + 5 = 25 — strictly equal to threshold, not heavier
    assert.equal(isHeavierTraffic(20, 25), false);
  });

  it('returns false when traffic is below the threshold', () => {
    assert.equal(isHeavierTraffic(20, 23), false);
  });

  it('returns false when traffic equals baseline', () => {
    assert.equal(isHeavierTraffic(20, 20), false);
  });

  it('returns false when traffic is less than baseline', () => {
    assert.equal(isHeavierTraffic(20, 18), false);
  });

  it('respects a custom threshold', () => {
    assert.equal(isHeavierTraffic(20, 23, 2), true);  // 3 > 2
    assert.equal(isHeavierTraffic(20, 22, 2), false); // 2 = 2, not strictly greater
  });

  it('default threshold matches HEAVY_TRAFFIC_THRESHOLD_MINUTES constant', () => {
    const justBelow = isHeavierTraffic(0, HEAVY_TRAFFIC_THRESHOLD_MINUTES);
    const justAbove = isHeavierTraffic(0, HEAVY_TRAFFIC_THRESHOLD_MINUTES + 1);
    assert.equal(justBelow, false);
    assert.equal(justAbove, true);
  });
});

// ── NullEtaProvider ───────────────────────────────────────────────────────────

describe('NullEtaProvider', () => {
  it('always returns null', async () => {
    // Import here to avoid pulling in the Expo module at the top level
    const { NullEtaProvider } = await import('./etaProvider');
    const provider = new NullEtaProvider();
    const result = await provider.fetchTravelTime(
      { latitude: 39.9042, longitude: -74.9929 },
      { latitude: 39.8765, longitude: -74.9123 },
    );
    assert.equal(result, null);
  });
});
