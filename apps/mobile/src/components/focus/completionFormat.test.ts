/**
 * formatCompletionLabel — unit tests
 *
 * Pure helper, no React Native imports, safe for Node test runner.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatCompletionLabel } from './completionFormat';

describe('formatCompletionLabel', () => {
  describe('missing / empty title', () => {
    it('returns fallback for null', () => {
      assert.equal(formatCompletionLabel(null), 'Completed ✓');
    });

    it('returns fallback for undefined', () => {
      assert.equal(formatCompletionLabel(undefined), 'Completed ✓');
    });

    it('returns fallback for empty string', () => {
      assert.equal(formatCompletionLabel(''), 'Completed ✓');
    });

    it('returns fallback for whitespace-only string', () => {
      assert.equal(formatCompletionLabel('   '), 'Completed ✓');
    });
  });

  describe('short titles — no truncation', () => {
    it('adds ✓ to a short title', () => {
      assert.equal(formatCompletionLabel('Pay mortgage'), 'Pay mortgage ✓');
    });

    it('handles exactly 28 characters without truncation', () => {
      const exactly28 = 'a'.repeat(28);
      assert.equal(formatCompletionLabel(exactly28), `${exactly28} ✓`);
    });

    it('trims leading/trailing whitespace before formatting', () => {
      assert.equal(formatCompletionLabel('  Pay mortgage  '), 'Pay mortgage ✓');
    });

    it('single-word title', () => {
      assert.equal(formatCompletionLabel('Call'), 'Call ✓');
    });
  });

  describe('long titles — truncated with ellipsis', () => {
    it('truncates titles longer than 28 characters', () => {
      const result = formatCompletionLabel('Grace volleyball tournament Saturday 9am');
      assert.ok(result.endsWith('… ✓'), `Should end with "… ✓": "${result}"`);
      assert.ok(!result.includes('Saturday'), 'Should not include text beyond 28 chars');
    });

    it('truncates expense report example', () => {
      const result = formatCompletionLabel('Submit expense report before Friday');
      assert.ok(result.endsWith('… ✓'), `Should end with "… ✓": "${result}"`);
    });

    it('result never exceeds 31 characters + " ✓" (28 title + ... + space + checkmark)', () => {
      const long = 'This is a very long title that goes well beyond the limit for display';
      const result = formatCompletionLabel(long);
      // "…" is one char; " ✓" is 2 chars; total after truncation: 28 + 1 + 1 + 1 = 31 chars
      // (the "…" replaces the overflowing chars, " ✓" follows)
      assert.ok(result.endsWith('… ✓'));
      const withoutSuffix = result.replace('… ✓', '');
      assert.ok(withoutSuffix.length <= 28, `Core label too long: ${withoutSuffix.length} chars`);
    });

    it('29-character title gets truncated', () => {
      const title29 = 'a'.repeat(29);
      const result = formatCompletionLabel(title29);
      assert.ok(result.endsWith('… ✓'));
    });

    it('does not trim trailing spaces before adding ellipsis (trimEnd prevents "word… ✓" with trailing space)', () => {
      // "abcdefghijklmnopqrstuvwxyz12 " — 29 chars, last is space
      // slice(0, 28) = "abcdefghijklmnopqrstuvwxyz12"
      // trimEnd = "abcdefghijklmnopqrstuvwxyz12" (no trailing space, no change)
      const title = 'abcdefghijklmnopqrstuvwxyz12 extra';
      const result = formatCompletionLabel(title);
      assert.ok(!result.startsWith('abcdefghijklmnopqrstuvwxyz12 … ✓'),
        'Trailing space before ellipsis should be trimmed');
    });
  });

  describe('real Ryan scenario titles', () => {
    it('Grace volleyball tournament', () => {
      const result = formatCompletionLabel('Grace volleyball tournament Saturday 9am');
      assert.ok(result.startsWith('Grace volleyball tournament'));
      assert.ok(result.endsWith('… ✓'));
    });

    it('Reagan cheer practice', () => {
      // "Reagan cheer practice Tuesday 6pm" = 33 chars → sliced at 28 = "Reagan cheer practice Tuesda"
      assert.equal(
        formatCompletionLabel('Reagan cheer practice Tuesday 6pm'),
        'Reagan cheer practice Tuesda… ✓',
      );
    });

    it('BFSC board meeting (under limit)', () => {
      assert.equal(formatCompletionLabel('BFSC board meeting'), 'BFSC board meeting ✓');
    });

    it('short financial item', () => {
      assert.equal(formatCompletionLabel('Review payment due tomorrow'), 'Review payment due tomorrow ✓');
    });

    it('expense report (over limit)', () => {
      const result = formatCompletionLabel('Submit expense report before Friday');
      assert.ok(result.endsWith('… ✓'));
      assert.ok(result.startsWith('Submit expense report'));
    });
  });
});
