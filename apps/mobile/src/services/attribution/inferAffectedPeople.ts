import type { Confidence } from '@/types/capture';
import type {
  CalendarEventAttendee,
  CalendarEventOrganizer,
} from '@/types/calendar';
import type { AffectedPerson, OwnerType } from '@/types/attribution';
import {
  isKnownPersonName,
  KNOWN_PEOPLE_DISPLAY,
  matchKnownPeopleInText,
} from '@/services/people/knownPeople';
import { safeLower, safeTrim } from '@/utils/safeString';

const HOUSEHOLD = ['Ryan', 'Crystal', 'Grace', 'Hudson', 'Quinn', 'Reagan'];
const CHILD_IDS = new Set(['grace', 'hudson', 'quinn', 'reagan']);
const LOGISTICS = ['pickup', 'pick up', 'drop off', 'soccer', 'hockey', 'swim', 'practice', 'school'];

function personId(name: string): string {
  return safeLower(name);
}

function addPerson(
  map: Map<string, AffectedPerson>,
  name: string,
  confidence: Confidence,
): void {
  if (!isKnownPersonName(name)) return;
  const id = personId(name);
  const existing = map.get(id);
  const rank = { high: 3, medium: 2, low: 1 };
  if (!existing || rank[confidence] > rank[existing.confidence]) {
    map.set(id, { personId: id, displayName: name, confidence });
  }
}

function personFromAttendee(
  a: CalendarEventAttendee,
): { id: string; name: string; confidence: Confidence } | null {
  const display = safeTrim(a.displayName);
  if (display && isKnownPersonName(display)) {
    return { id: personId(display), name: display, confidence: 'medium' };
  }
  return null;
}

/**
 * Affected people are separate from owner — who the event touches.
 */
export function inferAffectedPeople(input: {
  title: string;
  description?: string;
  attendees?: CalendarEventAttendee[];
  ownerType: OwnerType;
  ownerPersonId: string | null;
  ownerDisplayName: string | null;
}): { affected: AffectedPerson[]; reason: string } {
  const map = new Map<string, AffectedPerson>();
  const text = [input.title, safeTrim(input.description)].filter(Boolean).join(' ');
  const lower = safeLower(text);

  for (const m of matchKnownPeopleInText(text)) {
    addPerson(map, m.name, m.confidence);
  }

  for (const a of input.attendees ?? []) {
    const p = personFromAttendee(a);
    if (p) addPerson(map, p.name, p.confidence);
  }

  const ownerId = input.ownerPersonId;
  if (ownerId) {
    const name =
      input.ownerDisplayName ??
      KNOWN_PEOPLE_DISPLAY.find((n) => personId(n) === ownerId) ??
      ownerId;
    addPerson(map, name, 'high');
  }

  const needsHousehold =
    LOGISTICS.some((s) => lower.includes(s)) ||
    input.ownerType === 'family' ||
    ['grace', 'hudson', 'quinn', 'reagan'].includes(ownerId ?? '');

  if (needsHousehold) {
    for (const name of HOUSEHOLD) {
      if (personId(name) === ownerId) continue;
      addPerson(map, name, ownerId ? 'medium' : 'low');
    }
    return {
      affected: Array.from(map.values()),
      reason: 'household_logistics_or_family_owner',
    };
  }

  if (input.ownerType === 'person' && ownerId === 'crystal' && lower.includes('trip')) {
    map.forEach((_, key) => {
      if (key !== 'crystal') map.delete(key);
    });
    addPerson(map, 'Crystal', 'high');
    return { affected: Array.from(map.values()), reason: 'personal_trip_owner_only' };
  }

  if (input.ownerType === 'unknown' && map.size === 0) {
    return { affected: [], reason: 'unknown_owner_no_people' };
  }

  if (input.ownerType === 'person' && ownerId === 'ryan' && !CHILD_IDS.has(ownerId)) {
    addPerson(map, 'Ryan', 'high');
    return { affected: Array.from(map.values()), reason: 'owner_ryan_work_or_board' };
  }

  return {
    affected: Array.from(map.values()),
    reason: map.size > 0 ? 'mentioned_or_attending' : 'none_detected',
  };
}
