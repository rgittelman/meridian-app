import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  haversineDistanceMeters,
  isWithinRegion,
  locationsTooClose,
  resolveCurrentRegion,
  SAME_LOCATION_THRESHOLD_METERS,
} from './geofenceHelpers';
import type { KnownLocation } from '@/store/locationStore';

// ── Fixtures ──────────────────────────────────────────────────────────────────

// Cherry Hill, NJ area (approximate home coordinates for testing)
const HOME: KnownLocation = {
  label: 'home',
  latitude: 39.9042,
  longitude: -74.9929,
  radiusMeters: 150,
};

// Philadelphia, PA (approximate work coordinates)
const WORK: KnownLocation = {
  label: 'work',
  latitude: 39.9526,
  longitude: -75.1652,
  radiusMeters: 150,
};

// ── haversineDistanceMeters ───────────────────────────────────────────────────

describe('haversineDistanceMeters', () => {
  it('returns 0 for identical coordinates', () => {
    const d = haversineDistanceMeters(39.9042, -74.9929, 39.9042, -74.9929);
    assert.equal(d, 0);
  });

  it('returns correct distance between two points ~1 km apart', () => {
    // ~1 km north of home
    const d = haversineDistanceMeters(39.9042, -74.9929, 39.9132, -74.9929);
    assert.ok(d > 900 && d < 1100, `expected ~1000m, got ${d.toFixed(0)}m`);
  });

  it('is symmetric — distance(A,B) === distance(B,A)', () => {
    const d1 = haversineDistanceMeters(39.9042, -74.9929, 39.9526, -75.1652);
    const d2 = haversineDistanceMeters(39.9526, -75.1652, 39.9042, -74.9929);
    assert.ok(Math.abs(d1 - d2) < 0.001, 'distances should be equal');
  });

  it('home to work is approximately 16-17 km', () => {
    const d = haversineDistanceMeters(HOME.latitude, HOME.longitude, WORK.latitude, WORK.longitude);
    assert.ok(d > 15_000 && d < 18_000, `expected 15-18 km, got ${(d / 1000).toFixed(2)} km`);
  });
});

// ── isWithinRegion ────────────────────────────────────────────────────────────

describe('isWithinRegion', () => {
  it('returns true when at exact known location', () => {
    assert.equal(isWithinRegion(HOME.latitude, HOME.longitude, HOME), true);
  });

  it('returns true when within radius', () => {
    // ~50m offset from home
    assert.equal(isWithinRegion(HOME.latitude + 0.0004, HOME.longitude, HOME), true);
  });

  it('returns false when outside radius', () => {
    // ~500m from home
    assert.equal(isWithinRegion(HOME.latitude + 0.004, HOME.longitude, HOME), false);
  });

  it('returns false when at work while checking home', () => {
    assert.equal(isWithinRegion(WORK.latitude, WORK.longitude, HOME), false);
  });

  it('respects the radiusMeters field — larger radius matches further point', () => {
    const wideHome: KnownLocation = { ...HOME, radiusMeters: 1000 };
    // ~500m offset — outside default 150m but inside 1000m
    assert.equal(isWithinRegion(HOME.latitude + 0.004, HOME.longitude, wideHome), true);
    assert.equal(isWithinRegion(HOME.latitude + 0.004, HOME.longitude, HOME), false);
  });
});

// ── resolveCurrentRegion ──────────────────────────────────────────────────────

describe('resolveCurrentRegion', () => {
  it('returns "home" when at home coordinates', () => {
    assert.equal(resolveCurrentRegion(HOME.latitude, HOME.longitude, HOME, WORK), 'home');
  });

  it('returns "work" when at work coordinates', () => {
    assert.equal(resolveCurrentRegion(WORK.latitude, WORK.longitude, HOME, WORK), 'work');
  });

  it('returns "away" when not at home or work but both are set', () => {
    // Somewhere in between — neither home nor work
    const awayLat = 39.93;
    const awayLon = -75.08;
    assert.equal(resolveCurrentRegion(awayLat, awayLon, HOME, WORK), 'away');
  });

  it('returns "unknown" when neither home nor work is set', () => {
    assert.equal(resolveCurrentRegion(39.93, -75.08, null, null), 'unknown');
  });

  it('returns "away" when only home is set and user is not home', () => {
    assert.equal(resolveCurrentRegion(WORK.latitude, WORK.longitude, HOME, null), 'away');
  });

  it('returns "away" when only work is set and user is not at work', () => {
    assert.equal(resolveCurrentRegion(HOME.latitude, HOME.longitude, null, WORK), 'away');
  });

  it('returns "home" when at home and work is not set', () => {
    assert.equal(resolveCurrentRegion(HOME.latitude, HOME.longitude, HOME, null), 'home');
  });

  it('returns "unknown" when home and work are the same coordinates (ambiguous data)', () => {
    const sameSpot: KnownLocation = { ...WORK, latitude: HOME.latitude, longitude: HOME.longitude };
    assert.equal(resolveCurrentRegion(HOME.latitude, HOME.longitude, HOME, sameSpot), 'unknown');
  });

  it('returns "unknown" when home and work are within conflict threshold', () => {
    // ~50m offset — within the 100m threshold
    const nearHome: KnownLocation = { ...WORK, latitude: HOME.latitude + 0.0004, longitude: HOME.longitude };
    assert.equal(resolveCurrentRegion(HOME.latitude, HOME.longitude, HOME, nearHome), 'unknown');
  });
});

// ── locationsTooClose ─────────────────────────────────────────────────────────

describe('locationsTooClose', () => {
  it('returns true when home and work have identical coordinates', () => {
    const sameAsHome: KnownLocation = { ...HOME, label: 'work' };
    assert.equal(locationsTooClose(HOME, sameAsHome), true);
  });

  it('returns true when home and work are within the default threshold', () => {
    // ~50m offset — well within 100m
    const nearHome: KnownLocation = {
      ...HOME,
      label: 'work',
      latitude: HOME.latitude + 0.0004,
    };
    const distance = haversineDistanceMeters(HOME.latitude, HOME.longitude, nearHome.latitude, nearHome.longitude);
    assert.ok(distance < SAME_LOCATION_THRESHOLD_METERS, `expected < ${SAME_LOCATION_THRESHOLD_METERS}m, got ${distance.toFixed(0)}m`);
    assert.equal(locationsTooClose(HOME, nearHome), true);
  });

  it('returns false when home and work are far apart', () => {
    assert.equal(locationsTooClose(HOME, WORK), false);
  });

  it('returns false when locations are just outside a custom threshold', () => {
    // ~200m offset
    const slightlyFar: KnownLocation = {
      ...HOME,
      label: 'work',
      latitude: HOME.latitude + 0.0018,
    };
    assert.equal(locationsTooClose(HOME, slightlyFar, 100), false);
  });

  it('respects a custom threshold — returns true when within it', () => {
    // ~200m offset — outside default 100m but within a 300m custom threshold
    const slightlyFar: KnownLocation = {
      ...HOME,
      label: 'work',
      latitude: HOME.latitude + 0.0018,
    };
    assert.equal(locationsTooClose(HOME, slightlyFar, 300), true);
  });
});
