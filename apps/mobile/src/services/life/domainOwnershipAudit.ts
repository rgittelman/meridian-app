import type { MeridianCalendarEvent } from '@/types/calendar';
import type { LifeDomainId } from '@/types/life';
import { resolvePrimaryEventDomain } from './resolvePrimaryEventDomain';
import { isDevEnvironment } from '@/utils/isDev';

type DomainFixture = {
  label: string;
  accept: LifeDomainId[];
  event: MeridianCalendarEvent;
};

function baseEvent(
  overrides: Partial<MeridianCalendarEvent> & Pick<MeridianCalendarEvent, 'id' | 'title' | 'displayTitle'>,
): MeridianCalendarEvent {
  const now = new Date();
  return {
    id: overrides.id,
    rawGoogleEventId: overrides.id,
    rawTitle: overrides.title,
    title: overrides.title,
    displayTitle: overrides.displayTitle,
    displaySubtitle: '',
    displayActivityType: null,
    displayPersonLabel: overrides.displayPersonLabel ?? null,
    startTime: overrides.startTime ?? now,
    endTime: overrides.endTime ?? new Date(now.getTime() + 3_600_000),
    allDay: false,
    status: 'confirmed',
    attendees: [],
    calendarSource: 'google',
    sourceType: 'google_calendar',
    sourceCalendarId: 'cal-1',
    sourceCalendarName: overrides.sourceCalendarName ?? 'Family Calendar',
    sourceCalendarPrimary: false,
    sourceCalendarAccessRole: 'reader',
    attribution: overrides.attribution ?? {
      sourceCalendarId: 'cal-1',
      sourceCalendarName: overrides.sourceCalendarName ?? 'Family Calendar',
      sourceCalendarDisplayLabel:
        overrides.displaySourceLabel ?? 'Family Calendar',
      ownerType: 'unknown',
      ownerConfidence: 'low',
      ownerPersonId: null,
      ownerDisplayName: null,
      affectedPeople: [],
      inferredDomain: 'personal',
      domainConfidence: 'low',
      sourcePreferences: {},
      diagnostics: {
        ownerCandidates: [],
        domainReason: 'fixture',
        affectedReason: '',
        decisionLog: [],
      },
    },
    inferredPeople: overrides.inferredPeople ?? [],
    inferredOwnerLabel: overrides.inferredOwnerLabel ?? null,
    sourceCalendarDisplayLabel:
      overrides.sourceCalendarDisplayLabel ?? 'Family Calendar',
    displaySourceLabel: overrides.displaySourceLabel ?? 'Family Calendar',
    attributionLabel: null,
    relevance: overrides.relevance ?? {
      relevanceScore: 'high',
      relevanceReason: 'fixture',
      relevanceConfidence: 'high',
      householdImpact: 'medium',
      matchedHouseholdMembers: [],
      sourceRole: 'commitment',
      isRelevant: true,
      preferences: {},
    },
    inferredLifeDomain: overrides.inferredLifeDomain ?? 'personal',
    inferredCategory: overrides.inferredCategory ?? null,
    categoryConfidence: 'medium',
    confidence: 'high',
    peopleImpact: 'MEDIUM',
    timingSensitivity: 'medium',
    emotionalWeight: 'MEDIUM',
    signalClassification: 'meaningful',
    relatedLifeObjectId: null,
    displayLabel: overrides.displayTitle,
    planAttributionLine: overrides.planAttributionLine ?? 'Family Calendar',
    displayTime: '2:00 PM',
  };
}

const DOMAIN_OWNERSHIP_FIXTURES: DomainFixture[] = [
  {
    label: 'BFSC Board Meeting with Crystal',
    accept: ['community'],
    event: baseEvent({
      id: 'fix-bfsc-board',
      title: 'BFSC Board Meeting',
      displayTitle: 'BFSC Board Meeting',
      displayPersonLabel: 'Crystal',
      inferredPeople: [{ name: 'Crystal', confidence: 'high' }],
      sourceCalendarName: 'Family Calendar',
      displaySourceLabel: 'Family Calendar',
    }),
  },
  {
    label: 'Ryan budget review',
    accept: ['work'],
    event: baseEvent({
      id: 'fix-ryan-budget',
      title: 'Ryan budget review',
      displayTitle: 'Ryan budget review',
      displayPersonLabel: 'Ryan',
      inferredCategory: 'work',
      sourceCalendarName: 'Work',
      displaySourceLabel: 'Work Calendar',
      planAttributionLine: 'Work Calendar',
    }),
  },
  {
    label: "Crystal doctor appointment",
    accept: ['health', 'personal'],
    event: baseEvent({
      id: 'fix-crystal-doctor',
      title: "Crystal doctor appointment",
      displayTitle: "Crystal doctor appointment",
      displayPersonLabel: 'Crystal',
      inferredCategory: 'health',
      description: 'Annual checkup',
    }),
  },
  {
    label: 'Hudson hockey',
    accept: ['family'],
    event: baseEvent({
      id: 'fix-hudson-hockey',
      title: 'Hudson hockey practice',
      displayTitle: 'Hudson hockey practice',
      displayPersonLabel: 'Hudson',
      sourceCalendarName: 'TeamSnap',
      displaySourceLabel: 'TeamSnap Hockey',
    }),
  },
  {
    label: 'Quinn hockey',
    accept: ['family'],
    event: baseEvent({
      id: 'fix-quinn-hockey',
      title: 'Quinn hockey game',
      displayTitle: 'Quinn hockey game',
      inferredPeople: [{ name: 'Quinn', confidence: 'high' }],
    }),
  },
  {
    label: 'Grace pickup',
    accept: ['family'],
    event: baseEvent({
      id: 'fix-grace-pickup',
      title: 'Grace pickup at 3:15',
      displayTitle: 'Grace pickup at 3:15',
      displayPersonLabel: 'Grace',
    }),
  },
  {
    label: 'Reagan school event',
    accept: ['family'],
    event: baseEvent({
      id: 'fix-reagan-school',
      title: 'Reagan parent teacher conference',
      displayTitle: 'Reagan parent teacher conference',
      sourceCalendarName: 'RCS School',
      displaySourceLabel: 'RCS School',
    }),
  },
  {
    label: '8th Grade Final Exams (no household child match)',
    accept: ['personal'],
    event: baseEvent({
      id: 'fix-grade-exams',
      title: '8th Grade Final Exams',
      displayTitle: '8th Grade Final Exams',
      sourceCalendarName: 'RCS School Feed',
      displaySourceLabel: 'RCS School',
      relevance: {
        relevanceScore: 'low',
        relevanceReason: 'school_feed',
        relevanceConfidence: 'low',
        householdImpact: 'none',
        matchedHouseholdMembers: [],
        sourceRole: 'context',
        isRelevant: false,
        preferences: {},
      },
    }),
  },
];

/**
 * Dev-only audit — verifies adult names do not force Family domain.
 */
export function logDomainOwnershipFixtureAudit(): void {
  if (!isDevEnvironment()) return;

  console.log('[Life Domain Ownership] ─── fixture audit ───');

  let passed = 0;
  let failed = 0;

  for (const fixture of DOMAIN_OWNERSHIP_FIXTURES) {
    const resolved = resolvePrimaryEventDomain(fixture.event);
    const ok = fixture.accept.includes(resolved);

    if (ok) {
      passed += 1;
      console.log('[Life Domain Ownership] PASS', {
        case: fixture.label,
        domain: resolved,
      });
    } else {
      failed += 1;
      console.warn('[Life Domain Ownership] FAIL', {
        case: fixture.label,
        expected: fixture.accept,
        got: resolved,
      });
    }
  }

  console.log('[Life Domain Ownership] summary', { passed, failed, total: DOMAIN_OWNERSHIP_FIXTURES.length });
}
