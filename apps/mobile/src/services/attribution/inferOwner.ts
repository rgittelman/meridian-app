import type { Confidence } from '@/types/capture';
import type {
  CalendarEventAttendee,
  CalendarEventOrganizer,
} from '@/types/calendar';
import type { CalendarNameSignals } from '@/services/context/inferCalendarContext';
import type { AttributionCandidate, OwnerType } from '@/types/attribution';
import type { LifeDomainId } from '@/types/life';
import {
  isKnownPersonName,
  KNOWN_PEOPLE_DISPLAY,
  matchKnownPeopleInText,
} from '@/services/people/knownPeople';
import type { EventInferenceContext } from './eventInferenceContext';
import { inferChildFromSportsTitle } from '@/services/relevance/childSportsContext';
import { HOUSEHOLD_CHILDREN, matchingChildrenInText } from '@/services/relevance/householdContext';
import { isSchoolCalendarSource } from '@/services/relevance/isSchoolSource';
import { safeLower, safeTrim } from '@/utils/safeString';

const CHILD_PERSON_IDS = new Set(HOUSEHOLD_CHILDREN.map((c) => c.personId));
const PARENT_COORDINATOR_IDS = new Set(['ryan', 'crystal']);
const RYAN_ALLOWED_REASONS = new Set([
  'work_calendar_explicit_ryan',
  'board_explicit_ryan',
]);

const SPORTS = ['soccer', 'hockey', 'swim', 'practice', 'game', 'cheer', 'tournament'];
const PICKUP = ['pickup', 'pick up', 'drop off', 'dropoff'];
const FAMILY_EVENT = ['vacation', 'family reunion', 'holiday'];
const WORK_OWNER_SIGNALS = ['leadership', 'budget', 'review', 'standup', 'qbr'];
const TEACHER_STAFF_PATTERN =
  /\b(?:mrs?\.|ms\.|mr\.|dr\.)\s+[a-z][a-z'\-]+/i;

export type OwnerResolution = {
  ownerType: OwnerType;
  ownerConfidence: Confidence;
  ownerPersonId: string | null;
  ownerDisplayName: string | null;
  candidates: AttributionCandidate[];
};

function personId(name: string): string {
  return safeLower(name);
}

function personFromGoogle(
  person?: CalendarEventOrganizer,
): { personId: string; displayName: string; confidence: Confidence } | null {
  if (!person) return null;
  const display = safeTrim(person.displayName);
  if (display && isKnownPersonName(display)) {
    return {
      personId: personId(display),
      displayName: display,
      confidence: 'high',
    };
  }
  const email = safeTrim(person.email);
  const local = email.split('@')[0]?.replace(/[._]/g, ' ');
  if (local && isKnownPersonName(local)) {
    const proper =
      KNOWN_PEOPLE_DISPLAY.find((n) => n.toLowerCase() === local.toLowerCase()) ??
      local.charAt(0).toUpperCase() + local.slice(1);
    return {
      personId: personId(proper),
      displayName: proper,
      confidence: person.self ? 'high' : 'medium',
    };
  }
  return null;
}

function titleOwnerSignal(title: string): AttributionCandidate | null {
  const text = safeTrim(title);
  const lower = safeLower(text);

  for (const name of KNOWN_PEOPLE_DISPLAY) {
    const activity = new RegExp(
      `\\b${name}\\s+(?:${[...SPORTS, ...PICKUP].join('|')})\\b`,
      'i',
    );
    const nameSport = new RegExp(`\\b${name}\\s+\\w+\\b`, 'i');
    if (activity.test(text) || (nameSport.test(text) && SPORTS.some((s) => lower.includes(s)))) {
      return {
        ownerType: 'person',
        personId: personId(name),
        displayName: name,
        confidence: 'high',
        reason: 'title_person_activity',
      };
    }
  }

  for (const name of KNOWN_PEOPLE_DISPLAY) {
    const prefix = new RegExp(`^${name}\\s*[-–:·•]`, 'i');
    if (prefix.test(text)) {
      return {
        ownerType: 'person',
        personId: personId(name),
        displayName: name,
        confidence: 'high',
        reason: 'title_person_prefix',
      };
    }
  }

  if (FAMILY_EVENT.some((s) => lower.includes(s))) {
    return {
      ownerType: 'family',
      personId: null,
      displayName: null,
      confidence: 'medium',
      reason: 'family_event_phrase',
    };
  }

  const tripWith = text.match(
    /\b(?:trip|weekend|getaway|girls?\s*trip)\s+(?:with\s+)?(Crystal|Grace|Reagan|Quinn|Hudson)\b/i,
  );
  if (tripWith?.[1]) {
    return {
      ownerType: 'person',
      personId: personId(tripWith[1]),
      displayName: tripWith[1],
      confidence: 'high',
      reason: 'title_trip_with_person',
    };
  }

  const crystalTrip =
    lower.includes('girls trip') ||
    lower.includes("girl's trip") ||
    (lower.includes('trip') && lower.includes('crystal'));
  if (crystalTrip && !SPORTS.some((s) => lower.includes(s))) {
    return {
      ownerType: 'person',
      personId: 'crystal',
      displayName: 'Crystal',
      confidence: lower.includes('crystal') ? 'high' : 'medium',
      reason: 'title_girls_trip',
    };
  }

  return null;
}

function ownerCandidateRank(c: AttributionCandidate): number {
  const rank = { high: 3, medium: 2, low: 1 };
  const reasonBoost: Record<string, number> = {
    child_sports_owner: 50,
    title_person_activity: 40,
    title_person_prefix: 38,
    school_event_child_named: 35,
  };
  return (reasonBoost[c.reason] ?? 0) + rank[c.confidence];
}

function pickBest(candidates: AttributionCandidate[]): OwnerResolution {
  const sorted = [...candidates].sort(
    (a, b) => ownerCandidateRank(b) - ownerCandidateRank(a),
  );
  const best = sorted[0];

  if (!best) {
    return {
      ownerType: 'unknown',
      ownerConfidence: 'low',
      ownerPersonId: null,
      ownerDisplayName: null,
      candidates: [],
    };
  }

  return {
    ownerType: best.ownerType,
    ownerConfidence: best.confidence,
    ownerPersonId: best.personId,
    ownerDisplayName: best.displayName,
    candidates,
  };
}

/**
 * Owner detection — evidence only; never default Ryan; never first title token.
 */
export function inferEventOwner(input: {
  title: string;
  description?: string;
  location?: string;
  creator?: CalendarEventOrganizer;
  organizer?: CalendarEventOrganizer;
  attendees?: CalendarEventAttendee[];
  calendarSignals?: CalendarNameSignals;
  sourceCalendarDisplayLabel: string;
  inferredDomain: LifeDomainId;
  youthSportsContext?: EventInferenceContext;
}): OwnerResolution {
  const candidates: AttributionCandidate[] = [];
  const text = [input.title, safeTrim(input.description)].filter(Boolean).join(' ');
  const lower = safeLower(text);
  const sourceLower = safeLower(input.sourceCalendarDisplayLabel);

  const sportsChild =
    input.youthSportsContext?.sportsChildPersonId
      ? HOUSEHOLD_CHILDREN.find(
          (c) => c.personId === input.youthSportsContext!.sportsChildPersonId,
        )
      : inferChildFromSportsTitle(input.title, input.location);

  if (sportsChild) {
    candidates.push({
      ownerType: 'person',
      personId: sportsChild.personId,
      displayName: sportsChild.name,
      confidence: 'high',
      reason: 'child_sports_owner',
    });
  } else if (
    input.youthSportsContext?.isYouthSports &&
    input.inferredDomain === 'family'
  ) {
    candidates.push({
      ownerType: 'family',
      personId: null,
      displayName: null,
      confidence: 'medium',
      reason: 'family_youth_sports_shared',
    });
  }

  const titleSignal = titleOwnerSignal(input.title);
  if (titleSignal) candidates.push(titleSignal);

  const schoolChildren = matchingChildrenInText(text);
  if (schoolChildren.length === 1) {
    const child = schoolChildren[0];
    candidates.push({
      ownerType: 'person',
      personId: child.personId,
      displayName: child.name,
      confidence: 'high',
      reason: 'school_event_child_named',
    });
  }

  if (isSchoolCalendarSource('', input.sourceCalendarDisplayLabel)) {
    if (
      lower.includes('announcement') ||
      lower.includes('newsletter') ||
      lower.includes('birthday') ||
      TEACHER_STAFF_PATTERN.test(text)
    ) {
      candidates.push({
        ownerType: 'organization',
        personId: null,
        displayName: null,
        confidence: 'medium',
        reason: 'school_feed_organization',
      });
    }
  }

  const textPeople = matchKnownPeopleInText(text);
  for (const p of textPeople) {
    if (titleSignal?.personId === personId(p.name)) continue;
    const conf: Confidence =
      p.confidence === 'high' || schoolChildren.some((c) => c.name === p.name)
        ? 'high'
        : 'medium';
    candidates.push({
      ownerType: 'person',
      personId: personId(p.name),
      displayName: p.name,
      confidence: conf,
      reason: 'known_name_in_text',
    });
  }

  if (
    input.inferredDomain === 'family' &&
    schoolChildren.length === 0 &&
    !titleSignal &&
    textPeople.length === 0 &&
    sourceLower.includes('family')
  ) {
    candidates.push({
      ownerType: 'family',
      personId: null,
      displayName: null,
      confidence: 'medium',
      reason: 'family_calendar_shared',
    });
  }

  const creator = personFromGoogle(input.creator);
  if (creator) {
    candidates.push({
      ownerType: 'person',
      personId: creator.personId,
      displayName: creator.displayName,
      confidence: input.creator?.self ? 'high' : creator.confidence,
      reason: 'event_creator',
    });
  }

  const organizer = personFromGoogle(input.organizer);
  if (organizer) {
    candidates.push({
      ownerType: 'person',
      personId: organizer.personId,
      displayName: organizer.displayName,
      confidence: input.organizer?.self ? 'high' : organizer.confidence,
      reason: 'event_organizer',
    });
  }

  if (
    input.inferredDomain === 'work' &&
    sourceLower.includes('work') &&
    WORK_OWNER_SIGNALS.some((s) => lower.includes(s))
  ) {
    const ryanOrganizer =
      organizer?.personId === 'ryan' && organizer.confidence === 'high';
    const ryanCreator = creator?.personId === 'ryan' && creator.confidence === 'high';
    const ryanTitle = textPeople.find(
      (p) => safeLower(p.name) === 'ryan' && p.confidence === 'high',
    );
    if (ryanOrganizer || ryanCreator || ryanTitle) {
      candidates.push({
        ownerType: 'person',
        personId: 'ryan',
        displayName: 'Ryan',
        confidence: 'high',
        reason: 'work_calendar_explicit_ryan',
      });
    } else {
      candidates.push({
        ownerType: 'organization',
        personId: null,
        displayName: null,
        confidence: 'medium',
        reason: 'work_calendar_no_person',
      });
    }
  }

  if (
    lower.includes('board') ||
    lower.includes('bfsc') ||
    sourceLower.includes('bfsc')
  ) {
    const ryanBoard = textPeople.find(
      (p) => safeLower(p.name) === 'ryan' && lower.includes('board'),
    );
    if (ryanBoard) {
      candidates.push({
        ownerType: 'person',
        personId: 'ryan',
        displayName: 'Ryan',
        confidence: 'high',
        reason: 'board_explicit_ryan',
      });
    } else {
      candidates.push({
        ownerType: 'community',
        personId: null,
        displayName: null,
        confidence: 'medium',
        reason: 'community_event',
      });
    }
  }

  const schoolNoise =
    lower.includes('announcement') ||
    lower.includes('newsletter') ||
    lower.includes('reminder:');
  if (
    creator?.personId === 'crystal' &&
    sourceLower.includes('family') &&
    !schoolNoise
  ) {
    const tripLike =
      input.inferredDomain === 'personal' ||
      lower.includes('trip') ||
      lower.includes('disney') ||
      lower.includes('getaway');
    candidates.push({
      ownerType: 'person',
      personId: 'crystal',
      displayName: 'Crystal',
      confidence: tripLike ? 'high' : 'medium',
      reason: 'creator_crystal_family_calendar',
    });
  }

  const childOwnerId =
    sportsChild?.personId ??
    schoolChildren[0]?.personId ??
    (titleSignal?.personId && CHILD_PERSON_IDS.has(titleSignal.personId)
      ? titleSignal.personId
      : null);

  const filtered = candidates.filter((c) => {
    if (c.personId === 'ryan') {
      if (!RYAN_ALLOWED_REASONS.has(c.reason)) return false;
      if (childOwnerId) return false;
    }
    if (
      childOwnerId &&
      c.personId &&
      PARENT_COORDINATOR_IDS.has(c.personId) &&
      (c.reason === 'event_creator' ||
        c.reason === 'event_organizer' ||
        c.reason === 'known_name_in_text')
    ) {
      return false;
    }
    return true;
  });

  return pickBest(filtered);
}
