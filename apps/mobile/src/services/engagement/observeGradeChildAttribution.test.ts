/**
 * O09 — Grade → Child Attribution — unit tests
 *
 * Inlines all dependencies to avoid the React Native import chain.
 * Same pattern as lifeSummary.test.ts / observePrepConnection.test.ts.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

// ── Inline types ──────────────────────────────────────────────────────────────

type HouseholdMemberProfile = {
  name: string;
  personId: string;
  role: 'parent' | 'child';
  schoolGrades: number[];
};

const HOUSEHOLD_CHILDREN: HouseholdMemberProfile[] = [
  { name: 'Grace',  personId: 'grace',  role: 'child', schoolGrades: [8] },
  { name: 'Reagan', personId: 'reagan', role: 'child', schoolGrades: [6] },
  { name: 'Quinn',  personId: 'quinn',  role: 'child', schoolGrades: [] },
  { name: 'Hudson', personId: 'hudson', role: 'child', schoolGrades: [] },
];

// ── Inline helpers (mirrors production implementations) ───────────────────────

function extractGradeNumbers(text: string): number[] {
  const grades = new Set<number>();
  const patterns = [
    /\b(\d{1,2})(?:st|nd|rd|th)\s*grade\b/gi,
    /\bgrade\s*(\d{1,2})\b/gi,
  ];
  for (const re of patterns) {
    let match: RegExpExecArray | null;
    const regex = new RegExp(re.source, re.flags);
    while ((match = regex.exec(text)) !== null) {
      const n = parseInt(match[1], 10);
      if (n >= 1 && n <= 12) grades.add(n);
    }
  }
  return Array.from(grades);
}

function safeLower(s: string): string {
  return s.toLowerCase();
}

function isSchoolCalendarSource(sourceCalendarName: string, displayLabel?: string): boolean {
  const name = safeLower(sourceCalendarName);
  const label = safeLower(displayLabel ?? '');
  if (name.includes('@') && name.includes('rcs')) return true;
  if (name.includes('rcs') || name.includes('cherry hill') || name.includes('cherryhill')) return true;
  if (name.includes('school') || name.includes('classroom') || name.includes('pta') || name.includes('district')) return true;
  return label.includes('school') || label.includes('rcs') || label === 'rcs school';
}

const SCHOOL_FEED_SUPPRESS = [
  'read-a-thon', 'readathon', 'read a thon', 'reward day', 'dress down',
  'dress up day', 'spirit week', 'extra recess', 'recess reward',
  'final exam', 'final exams', 'exam schedule', 'testing schedule',
  'announcement', 'newsletter', 'district notice', 'district-wide',
  'reminder:', 'awareness', 'informational', 'fundraiser', 'yearbook',
  'book fair', 'spirit wear', 'pto meeting', 'staff appreciation',
  'teacher appreciation', "teacher's birthday", 'birthday',
  'early dismissal', 'no school', 'school closed', 'professional day',
  'institute day',
];

function isSchoolInformationalFeed(title: string, description?: string): boolean {
  const lower = safeLower([title, description ?? ''].filter(Boolean).join(' '));
  return SCHOOL_FEED_SUPPRESS.some((s) => lower.includes(s));
}

function gradeSuffix(n: number): string {
  if (n === 11 || n === 12 || n === 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

type MinimalEvent = {
  title: string;
  sourceCalendarName: string;
  sourceCalendarDisplayLabel: string;
  description?: string;
};

type GradeChildObservation = {
  text: string;
  child: HouseholdMemberProfile;
  grade: number;
};

function observeGradeChildAttribution(weekEvents: MinimalEvent[]): GradeChildObservation | null {
  for (const event of weekEvents) {
    if (!isSchoolCalendarSource(event.sourceCalendarName, event.sourceCalendarDisplayLabel)) continue;
    if (isSchoolInformationalFeed(event.title, event.description)) continue;
    const grades = extractGradeNumbers(event.title);
    if (grades.length === 0) continue;
    for (const grade of grades) {
      const matches = HOUSEHOLD_CHILDREN.filter((c) => c.schoolGrades.includes(grade));
      if (matches.length !== 1) continue;
      const child = matches[0];
      const suffix = gradeSuffix(grade);
      return {
        text: `Something for ${grade}${suffix} grade is on the calendar this week — likely ${child.name}'s.`,
        child,
        grade,
      };
    }
  }
  return null;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const RCS = 'rcs.school.nj';
const FAMILY_CAL = 'Family Calendar';

function makeEvent(title: string, source = RCS, displayLabel = 'RCS School', description?: string): MinimalEvent {
  return { title, sourceCalendarName: source, sourceCalendarDisplayLabel: displayLabel, description };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('observeGradeChildAttribution', () => {

  describe('positive — correct attribution', () => {
    it('6th grade → Reagan', () => {
      const result = observeGradeChildAttribution([makeEvent('6th Grade Field Trip')]);
      assert.ok(result, 'should return an observation');
      assert.equal(result.child.personId, 'reagan');
      assert.equal(result.grade, 6);
      assert.equal(result.text, "Something for 6th grade is on the calendar this week — likely Reagan's.");
    });

    it('8th grade → Grace', () => {
      const result = observeGradeChildAttribution([makeEvent('8th Grade Graduation Practice')]);
      assert.ok(result);
      assert.equal(result.child.personId, 'grace');
      assert.equal(result.grade, 8);
      assert.equal(result.text, "Something for 8th grade is on the calendar this week — likely Grace's.");
    });

    it('accepts "grade 6" word order', () => {
      const result = observeGradeChildAttribution([makeEvent('Grade 6 Science Fair')]);
      assert.ok(result);
      assert.equal(result.child.personId, 'reagan');
    });

    it('returns first qualifying event when multiple school events present', () => {
      const result = observeGradeChildAttribution([
        makeEvent('6th Grade Choir Concert'),
        makeEvent('8th Grade Awards Night'),
      ]);
      assert.ok(result);
      assert.equal(result.grade, 6);
    });
  });

  describe('negative — no observation fired', () => {
    it('ambiguous grade — no household child owns it', () => {
      const result = observeGradeChildAttribution([makeEvent('3rd Grade Book Fair')]);
      assert.equal(result, null, 'grade 3 has no household owner → no observation');
    });

    it('non-school calendar source → no observation', () => {
      const result = observeGradeChildAttribution([
        makeEvent('6th Grade Field Trip', FAMILY_CAL, 'Family Calendar'),
      ]);
      assert.equal(result, null, 'family calendar is not a school source');
    });

    it('school source but no grade in title', () => {
      const result = observeGradeChildAttribution([makeEvent('Drama Club Rehearsal')]);
      assert.equal(result, null);
    });

    it('informational school feed — final exams', () => {
      const result = observeGradeChildAttribution([makeEvent('6th Grade Final Exams')]);
      assert.equal(result, null, 'final exams is a suppressed informational feed item');
    });

    it('informational school feed — early dismissal', () => {
      const result = observeGradeChildAttribution([makeEvent('6th Grade Early Dismissal')]);
      assert.equal(result, null);
    });

    it('informational school feed — spirit week', () => {
      const result = observeGradeChildAttribution([makeEvent('Spirit Week — 6th Grade Theme Day')]);
      assert.equal(result, null);
    });

    it('stale/cached calendar — empty array returns null', () => {
      const result = observeGradeChildAttribution([]);
      assert.equal(result, null, 'no events → no observation (stale calendar gate)');
    });

    it('grade maps to no household child — grade 7 has no owner', () => {
      const result = observeGradeChildAttribution([makeEvent('7th Grade Science Fair')]);
      assert.equal(result, null);
    });
  });

  describe('grade suffix formatting', () => {
    it('6th grade uses "th" suffix', () => {
      const result = observeGradeChildAttribution([makeEvent('6th Grade Volleyball Tournament')]);
      assert.ok(result?.text.includes('6th grade'));
    });

    it('8th grade uses "th" suffix', () => {
      const result = observeGradeChildAttribution([makeEvent('8th Grade Awards')]);
      assert.ok(result?.text.includes('8th grade'));
    });
  });

});
