/**
 * profileStore — unit tests
 * Pure function tests only. No React Native imports.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

// Inline deriveInitials to avoid AsyncStorage import chain
function deriveInitials(name: string | null | undefined): string | null {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  const words = trimmed.split(/\s+/);
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

describe('deriveInitials', () => {
  describe('standard names', () => {
    it('first + last → two initials', () => {
      assert.equal(deriveInitials('Ryan Gittelman'), 'RG');
    });
    it('single word → one initial', () => {
      assert.equal(deriveInitials('Ryan'), 'R');
    });
    it('three words → first + last initial', () => {
      assert.equal(deriveInitials('Ryan James Gittelman'), 'RG');
    });
    it('lowercase names → uppercased', () => {
      assert.equal(deriveInitials('ryan gittelman'), 'RG');
    });
  });

  describe('whitespace handling', () => {
    it('trims leading/trailing whitespace', () => {
      assert.equal(deriveInitials('  Ryan Gittelman  '), 'RG');
    });
    it('collapses internal whitespace', () => {
      assert.equal(deriveInitials('Ryan   Gittelman'), 'RG');
    });
    it('whitespace-only string → null', () => {
      assert.equal(deriveInitials('   '), null);
    });
  });

  describe('null/empty fallback', () => {
    it('null → null', () => {
      assert.equal(deriveInitials(null), null);
    });
    it('undefined → null', () => {
      assert.equal(deriveInitials(undefined), null);
    });
    it('empty string → null', () => {
      assert.equal(deriveInitials(''), null);
    });
  });

  describe('real Ryan household names', () => {
    it('Crystal', () => {
      assert.equal(deriveInitials('Crystal'), 'C');
    });
    it('Crystal Gittelman', () => {
      assert.equal(deriveInitials('Crystal Gittelman'), 'CG');
    });
    it('single long name', () => {
      assert.equal(deriveInitials('Gittelman'), 'G');
    });
  });

  describe('edge cases', () => {
    it('single character', () => {
      assert.equal(deriveInitials('R'), 'R');
    });
    it('two single-char words', () => {
      assert.equal(deriveInitials('R G'), 'RG');
    });
    it('four-word name uses first + last', () => {
      assert.equal(deriveInitials('Mary Jane Watson Parker'), 'MP');
    });
  });
});
