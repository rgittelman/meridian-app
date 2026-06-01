/**
 * Meridian Resurfacing — LifeObject → FocusItemData bridge.
 *
 * Translates the capture domain (LifeObject, CaptureParseResult) into
 * the priority domain (FocusItemData, FocusItemIntelligence) so the
 * existing priority scorer can evaluate resurfaced captures without
 * modification.
 *
 * This is a pure function. It takes signals from the parse result and
 * produces intelligence metadata — no network calls, no side effects.
 */

import type { LifeObject } from '@/types/capture';
import type { MeridianCalendarEvent } from '@/types/calendar';
import type {
  DueWindow,
  EmotionalWeight,
  FocusItemData,
  MomentumValue,
  PeopleImpact,
  UrgencyLevel,
} from '@/services/priority/types';
import { personFieldForDisplay } from '@/utils/parsing/personForDisplay';
import { isChildMorningCommitment } from './childMorningCommitment';
import { deriveDueWindow } from './timingWindow';

// ── Mapping helpers ───────────────────────────────────────────────────────────

function mapUrgency(raw: string | undefined): UrgencyLevel {
  switch (raw) {
    case 'CRITICAL': return 'CRITICAL';
    case 'HIGH':     return 'HIGH';
    case 'MEDIUM':   return 'MEDIUM';
    default:         return 'LOW';
  }
}

function mapEmotionalWeight(raw: string | undefined): EmotionalWeight {
  switch (raw) {
    case 'CRITICAL': return 'CRITICAL';
    case 'HIGH':     return 'HIGH';
    case 'MEDIUM':   return 'MEDIUM';
    default:         return 'LOW';
  }
}

function derivePeopleImpact(obj: LifeObject): PeopleImpact {
  const { parse } = obj;
  const highPeople = parse.people.filter((p) => p.confidence === 'high');
  const anyPeople = parse.people.length > 0;

  // Family commitment with known person = VERY_HIGH
  if (parse.category?.value === 'family' && highPeople.length > 0) {
    return 'VERY_HIGH';
  }

  // Any high-confidence person detected = HIGH
  if (highPeople.length > 0) {
    return 'HIGH';
  }

  // Medium-confidence person = MEDIUM
  if (parse.people.some((p) => p.confidence === 'medium')) {
    return 'MEDIUM';
  }

  // Low-confidence person reference
  if (anyPeople) {
    return 'LOW';
  }

  return 'NONE';
}

function mapMomentum(value: number): MomentumValue {
  if (value >= 0.68) return 'HIGH';
  if (value >= 0.40) return 'MEDIUM';
  return 'LOW';
}

// ── Primary bridge ────────────────────────────────────────────────────────────

/**
 * Converts a LifeObject from the capture store into a FocusItemData
 * that the priority scorer can evaluate.
 *
 * Intelligence fields are derived conservatively — when uncertain,
 * we default toward lower values rather than inflating.
 */
function dueWindowFromLinkedEvent(
  obj: LifeObject,
  event: MeridianCalendarEvent | undefined,
): DueWindow | null {
  if (!event || !obj.linkedCalendarEventId || obj.relationshipConfidence === 'low') {
    return null;
  }

  const hoursUntil = (event.startTime.getTime() - Date.now()) / 3_600_000;
  if (hoursUntil < -2) return null;

  const startHour = event.startTime.getHours();
  const isEarlyMorning = startHour < 11;

  if (
    isChildMorningCommitment(obj, event) &&
    hoursUntil > 0 &&
    hoursUntil <= 14 &&
    isEarlyMorning
  ) {
    if (hoursUntil <= 8) return 'NOW';
    return 'TOMORROW';
  }

  if (obj.relationshipType === 'prep_for_event' || obj.relationshipType === 'work_related') {
    if (hoursUntil <= 6) return 'NOW';
    if (hoursUntil <= 24) return 'TODAY';
    if (hoursUntil <= 48) return 'THIS_WEEK';
  }

  if (obj.relationshipType === 'bring_to_event') {
    if (hoursUntil <= 3) return 'NOW';
    if (hoursUntil <= 14 && isEarlyMorning) return 'TOMORROW';
    if (hoursUntil <= 12) return 'TODAY';
  }

  if (obj.relationshipType === 'community_related' && hoursUntil <= 24) {
    return 'TODAY';
  }

  return null;
}

export function bridgeLifeObject(
  obj: LifeObject,
  linkedEvent?: MeridianCalendarEvent,
): FocusItemData {
  const { parse, title, momentumValue } = obj;

  const dueWindow: DueWindow =
    dueWindowFromLinkedEvent(obj, linkedEvent) ?? deriveDueWindow(parse.timing);
  const peopleImpact = derivePeopleImpact(obj);

  // Flags
  const isFamilyCommitment =
    parse.category?.value === 'family' && parse.people.length > 0;

  const isFinancial = parse.category?.value === 'financial';

  // Stress prevention: high emotional weight item due within a week
  const isStressPrevention =
    (parse.emotionalWeight?.value === 'HIGH' || parse.emotionalWeight?.value === 'CRITICAL') &&
    dueWindow !== 'LATER';

  // Energy estimate: low for quick tasks, high for complex ones
  // Without a dedicated extractor, use momentum as a rough inverse proxy
  // High momentum = high relief when done → often medium energy items
  const estimatedEnergy =
    momentumValue >= 0.7 ? 'MEDIUM' :
    momentumValue >= 0.5 ? 'MEDIUM' :
    'LOW';

  // Display person — highest-confidence person, non-low
  const displayPerson = personFieldForDisplay(parse.people)?.value;

  // Display time — timing label if medium+ confidence
  const displayTime =
    parse.timing && parse.timing.confidence !== 'low'
      ? parse.timing.value.label
      : undefined;

  return {
    id: obj.id,
    title,
    person: displayPerson,
    time: displayTime,
    completed: obj.status === 'done',
    intelligence: {
      urgency: mapUrgency(parse.urgency?.value),
      emotionalWeight: mapEmotionalWeight(parse.emotionalWeight?.value),
      peopleImpact,
      dueWindow,
      estimatedEnergy,
      momentumValue: mapMomentum(momentumValue),
      category: parse.category?.value,
      isFamilyCommitment,
      isFinancial,
      isStressPrevention,
    },
  };
}
