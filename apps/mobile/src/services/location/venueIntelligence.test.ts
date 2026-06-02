import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  classifyVenueLocation,
  normalizeVenueLocation,
  resolveVenueCacheDecision,
  shouldAttemptVenueGeocode,
  VENUE_FAILURE_RETRY_MS,
  type VenueCacheEntry,
} from './venueIntelligence';

// ── normalizeVenueLocation ────────────────────────────────────────────────────

describe('normalizeVenueLocation', () => {
  it('lowercases and trims', () => {
    assert.equal(normalizeVenueLocation('  Cherry Hill Soccer Complex  '), 'cherry hill soccer complex');
  });

  it('collapses internal whitespace', () => {
    assert.equal(normalizeVenueLocation('Cherry  Hill   Soccer'), 'cherry hill soccer');
  });

  it('strips trailing punctuation', () => {
    assert.equal(normalizeVenueLocation('Main St.'), 'main st');
    assert.equal(normalizeVenueLocation('Field 3,'), 'field 3');
    assert.equal(normalizeVenueLocation('Room 4B;'), 'room 4b');
  });

  it('is stable — same input always produces same key', () => {
    const input = 'Cherry Hill Soccer Complex';
    assert.equal(normalizeVenueLocation(input), normalizeVenueLocation(input));
  });

  it('handles empty string', () => {
    assert.equal(normalizeVenueLocation(''), '');
    assert.equal(normalizeVenueLocation('   '), '');
  });
});

// ── shouldAttemptVenueGeocode — skip cases ────────────────────────────────────

describe('shouldAttemptVenueGeocode — skip cases', () => {
  it('returns false for blank string', () => {
    assert.equal(shouldAttemptVenueGeocode(''), false);
    assert.equal(shouldAttemptVenueGeocode('   '), false);
  });

  it('returns false for TBD', () => {
    assert.equal(shouldAttemptVenueGeocode('TBD'), false);
    assert.equal(shouldAttemptVenueGeocode('tbd'), false);
  });

  it('returns false for TBA', () => {
    assert.equal(shouldAttemptVenueGeocode('TBA'), false);
  });

  it('returns false for Away', () => {
    assert.equal(shouldAttemptVenueGeocode('Away'), false);
    assert.equal(shouldAttemptVenueGeocode('away'), false);
  });

  it('returns false for Home', () => {
    assert.equal(shouldAttemptVenueGeocode('Home'), false);
    assert.equal(shouldAttemptVenueGeocode('home'), false);
  });

  it('returns false for virtual/online/remote', () => {
    assert.equal(shouldAttemptVenueGeocode('Virtual'), false);
    assert.equal(shouldAttemptVenueGeocode('Online'), false);
    assert.equal(shouldAttemptVenueGeocode('Remote'), false);
  });

  it('returns false for https:// URLs', () => {
    assert.equal(shouldAttemptVenueGeocode('https://zoom.us/j/123456'), false);
    assert.equal(shouldAttemptVenueGeocode('https://meet.google.com/abc-defg'), false);
  });

  it('returns false for Zoom links', () => {
    assert.equal(shouldAttemptVenueGeocode('zoom.us/j/12345'), false);
  });

  it('returns false for Google Meet links', () => {
    assert.equal(shouldAttemptVenueGeocode('https://meet.google.com/xyz'), false);
  });

  it('returns false for strings under 4 characters', () => {
    assert.equal(shouldAttemptVenueGeocode('A'), false);
    assert.equal(shouldAttemptVenueGeocode('AB'), false);
    assert.equal(shouldAttemptVenueGeocode('AB3'), false);
  });
});

// ── shouldAttemptVenueGeocode — accept cases ─────────────────────────────────

describe('shouldAttemptVenueGeocode — accept cases', () => {
  it('returns true for a named venue', () => {
    assert.equal(shouldAttemptVenueGeocode('Cherry Hill Soccer Complex'), true);
  });

  it('returns true for a street address', () => {
    assert.equal(shouldAttemptVenueGeocode('1000 Commerce Pkwy, Cherry Hill NJ'), true);
  });

  it('returns true for a gym or school name', () => {
    assert.equal(shouldAttemptVenueGeocode('BFSC Field 3'), true);
    assert.equal(shouldAttemptVenueGeocode('Voorhees Middle School'), true);
  });

  it('returns true for a city-level location', () => {
    assert.equal(shouldAttemptVenueGeocode('Philadelphia, PA'), true);
  });
});

// ── classifyVenueLocation — reason codes ─────────────────────────────────────

describe('classifyVenueLocation', () => {
  it('blank → reason: blank', () => {
    const r = classifyVenueLocation('');
    assert.equal(r.shouldGeocode, false);
    if (!r.shouldGeocode) assert.equal(r.reason, 'blank');
  });

  it('TBD → reason: vague', () => {
    const r = classifyVenueLocation('TBD');
    assert.equal(r.shouldGeocode, false);
    if (!r.shouldGeocode) assert.equal(r.reason, 'vague');
  });

  it('short string → reason: too_short', () => {
    const r = classifyVenueLocation('A1');
    assert.equal(r.shouldGeocode, false);
    if (!r.shouldGeocode) assert.equal(r.reason, 'too_short');
  });

  it('URL → reason: virtual', () => {
    const r = classifyVenueLocation('https://zoom.us/j/123');
    assert.equal(r.shouldGeocode, false);
    if (!r.shouldGeocode) assert.equal(r.reason, 'virtual');
  });

  it('real venue → shouldGeocode: true with normalizedKey', () => {
    const r = classifyVenueLocation('Cherry Hill Soccer Complex');
    assert.equal(r.shouldGeocode, true);
    if (r.shouldGeocode) assert.equal(r.normalizedKey, 'cherry hill soccer complex');
  });
});

// ── resolveVenueCacheDecision ─────────────────────────────────────────────────

describe('resolveVenueCacheDecision', () => {
  const NOW = Date.now();

  const successEntry: VenueCacheEntry = {
    normalizedKey: 'cherry hill soccer complex',
    sourceString: 'Cherry Hill Soccer Complex',
    coordinates: { latitude: 39.9042, longitude: -74.9929 },
    geocodeSucceeded: true,
    lastAttemptedAt: NOW - 60_000,
  };

  const recentFailure: VenueCacheEntry = {
    normalizedKey: 'unknown place',
    sourceString: 'Unknown Place',
    coordinates: null,
    geocodeSucceeded: false,
    lastAttemptedAt: NOW - 60_000, // 1 minute ago — within 24h
  };

  const oldFailure: VenueCacheEntry = {
    normalizedKey: 'old place',
    sourceString: 'Old Place',
    coordinates: null,
    geocodeSucceeded: false,
    lastAttemptedAt: NOW - (VENUE_FAILURE_RETRY_MS + 1000), // older than 24h
  };

  it('cache miss (no entry) → attempt', () => {
    assert.equal(resolveVenueCacheDecision(undefined, NOW), 'attempt');
  });

  it('cached success → use_cached_success', () => {
    assert.equal(resolveVenueCacheDecision(successEntry, NOW), 'use_cached_success');
  });

  it('recent failure → skip_recent_failure', () => {
    assert.equal(resolveVenueCacheDecision(recentFailure, NOW), 'skip_recent_failure');
  });

  it('failure older than 24h → attempt (retry)', () => {
    assert.equal(resolveVenueCacheDecision(oldFailure, NOW), 'attempt');
  });

  it('success entry is reused regardless of age', () => {
    const veryOldSuccess: VenueCacheEntry = {
      ...successEntry,
      lastAttemptedAt: NOW - 30 * 24 * 60 * 60 * 1000, // 30 days ago
    };
    assert.equal(resolveVenueCacheDecision(veryOldSuccess, NOW), 'use_cached_success');
  });

  it('failure exactly at retry boundary → attempt', () => {
    const boundaryFailure: VenueCacheEntry = {
      ...recentFailure,
      lastAttemptedAt: NOW - VENUE_FAILURE_RETRY_MS,
    };
    assert.equal(resolveVenueCacheDecision(boundaryFailure, NOW), 'attempt');
  });
});
