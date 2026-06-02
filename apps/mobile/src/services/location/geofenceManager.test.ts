import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  haversineDistanceMeters,
  isWithinRegion,
  resolveCurrentRegion,
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

  it('prioritises home over work if coordinates overlap (edge case)', () => {
    // Home and work set to the same spot
    const sameSpot: KnownLocation = { ...WORK, latitude: HOME.latitude, longitude: HOME.longitude };
    assert.equal(resolveCurrentRegion(HOME.latitude, HOME.longitude, HOME, sameSpot), 'home');
  });
});
