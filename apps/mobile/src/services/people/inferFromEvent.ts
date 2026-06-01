import type { Confidence } from '@/types/capture';
import type { CalendarEventOrganizer } from '@/types/calendar';
import { extractCategory } from '@/utils/parsing/extractCategory';
import type { CalendarNameSignals } from '@/services/context/inferCalendarContext';
import type { EmotionalWeight, ItemCategory, PeopleImpact } from '@/services/priority/types';
import {
  isKnownPersonName,
  matchKnownPeopleInText,
} from '@/services/people/knownPeople';
import { safeLower, safeTrim } from '@/utils/safeString';

const COMMUNITY_SIGNALS = ['board', 'bfsc', 'community', 'nonprofit', 'volunteer'];
const WORK_SIGNALS = [
  'budget', 'sales', 'meeting', 'review', 'standup', 'sync', 'qbr', 'pipeline',
];
const SPORTS_SIGNALS = ['soccer', 'hockey', 'swim', 'practice', 'game', 'tournament'];
const HEALTH_SIGNALS = ['dentist', 'doctor', 'pediatrician', 'appointment', 'checkup'];
const PICKUP_SIGNALS = ['pickup', 'pick up', 'drop off', 'dropoff'];

export type EventInference = {
  inferredPeople: Array<{ name: string; confidence: Confidence }>;
  inferredOwnerLabel: string | null;
  sourceCalendarDisplayLabel: string;
  attributionLabel: string | null;
  inferredCategory: ItemCategory | null;
  categoryConfidence: Confidence;
  peopleImpact: PeopleImpact;
  timingSensitivity: 'low' | 'medium' | 'high';
  emotionalWeight: EmotionalWeight;
  confidence: Confidence;
};

function primaryPerson(
  people: Array<{ name: string; confidence: Confidence }>,
): { name: string; confidence: Confidence } | null {
  if (people.length === 0) return null;
  const sorted = [...people].sort((a, b) => {
    const rank = { high: 3, medium: 2, low: 1 };
    return rank[b.confidence] - rank[a.confidence];
  });
  return sorted[0];
}

function personKey(name: string | null | undefined): string {
  return safeLower(name);
}

function shortActivityPhrase(title: string, personName?: string): string {
  const safeTitle = safeTrim(title, 'Event');
  const lower = safeLower(safeTitle);
  if (PICKUP_SIGNALS.some((s) => lower.includes(s))) return 'Pickup';
  for (const sport of SPORTS_SIGNALS) {
    if (lower.includes(sport)) {
      return sport.charAt(0).toUpperCase() + sport.slice(1);
    }
  }
  for (const h of HEALTH_SIGNALS) {
    if (lower.includes(h)) {
      return h.charAt(0).toUpperCase() + h.slice(1);
    }
  }
  if (personName && isKnownPersonName(personName)) {
    const stripped = safeTitle
      .replace(new RegExp(personName, 'i'), '')
      .replace(/^[-–·\s]+/, '')
      .trim();
    if (stripped.length >= 3 && stripped.length <= 40) {
      return stripped.charAt(0).toUpperCase() + stripped.slice(1);
    }
  }
  if (safeTitle.length <= 40) return safeTitle;
  return safeTitle.slice(0, 36).trim() + '…';
}

/**
 * Calendar-safe people inference — known names only, no first-token guessing.
 */
export function inferFromEventTitle(title: string | null | undefined): EventInference {
  const text = safeTrim(title);
  const lower = safeLower(text);

  const knownMatches = matchKnownPeopleInText(text);
  const inferredPeople: Array<{ name: string; confidence: Confidence }> = [
    ...knownMatches.map((m) => ({ name: m.name, confidence: m.confidence })),
  ];

  const catField = extractCategory(text);
  let inferredCategory = catField?.value ?? null;
  let categoryConfidence: Confidence = catField?.confidence ?? 'low';

  if (!inferredCategory) {
    if (PICKUP_SIGNALS.some((s) => lower.includes(s)) || SPORTS_SIGNALS.some((s) => lower.includes(s))) {
      inferredCategory = 'family';
      categoryConfidence = 'high';
    } else if (COMMUNITY_SIGNALS.some((s) => lower.includes(s))) {
      inferredCategory = 'personal';
      categoryConfidence = 'medium';
    } else if (WORK_SIGNALS.some((s) => lower.includes(s))) {
      inferredCategory = 'work';
      categoryConfidence = 'medium';
    } else if (HEALTH_SIGNALS.some((s) => lower.includes(s))) {
      inferredCategory = 'health';
      categoryConfidence = 'medium';
    }
  }

  const person = primaryPerson(inferredPeople.filter((p) => isKnownPersonName(p.name)));

  let peopleImpact: PeopleImpact = 'NONE';
  if (person?.confidence === 'high' && inferredCategory === 'family') {
    peopleImpact = 'HIGH';
  } else if (PICKUP_SIGNALS.some((s) => lower.includes(s)) && person) {
    peopleImpact = 'HIGH';
  } else if (person?.confidence === 'high') {
    peopleImpact = 'MEDIUM';
  }

  let timingSensitivity: 'low' | 'medium' | 'high' = 'medium';
  if (PICKUP_SIGNALS.some((s) => lower.includes(s))) {
    timingSensitivity = 'high';
  } else if (inferredCategory === 'family' && SPORTS_SIGNALS.some((s) => lower.includes(s))) {
    timingSensitivity = 'high';
  } else if (COMMUNITY_SIGNALS.some((s) => lower.includes(s)) && lower.includes('board')) {
    timingSensitivity = 'high';
  } else if (inferredCategory === 'work' && WORK_SIGNALS.some((s) => lower.includes(s))) {
    timingSensitivity = 'medium';
  }

  let emotionalWeight: EmotionalWeight = 'LOW';
  if (peopleImpact === 'HIGH' && timingSensitivity === 'high') {
    emotionalWeight = 'HIGH';
  } else if (peopleImpact === 'HIGH' || timingSensitivity === 'high') {
    emotionalWeight = 'MEDIUM';
  } else if (inferredCategory === 'work' && WORK_SIGNALS.some((s) => lower.includes(s))) {
    emotionalWeight = 'MEDIUM';
  }

  const confidence: Confidence =
    person?.confidence === 'high' && inferredCategory
      ? 'high'
      : person?.confidence === 'high'
        ? 'medium'
        : inferredCategory && categoryConfidence !== 'low'
          ? 'medium'
          : 'low';

  return {
    inferredPeople: inferredPeople.filter((p) => isKnownPersonName(p.name)),
    inferredOwnerLabel: null,
    sourceCalendarDisplayLabel: 'Calendar',
    attributionLabel: null,
    inferredCategory,
    categoryConfidence,
    peopleImpact,
    timingSensitivity,
    emotionalWeight,
    confidence,
  };
}

/** Build display label — never invent person from first title token. */
export function buildEventDisplayLabel(
  title: string | null | undefined,
  inference: EventInference,
): string {
  const safeTitle = safeTrim(title, 'Untitled');
  const owner = inference.inferredOwnerLabel;
  const person = inference.inferredPeople.find((p) => p.confidence === 'high');

  if (
    owner &&
    owner !== 'Work' &&
    isKnownPersonName(owner) &&
    (person?.confidence === 'high' || person?.name === owner)
  ) {
    return `${owner} · ${shortActivityPhrase(safeTitle, owner)}`;
  }

  if (owner === 'Work' || inference.inferredCategory === 'work') {
    const activity = shortActivityPhrase(safeTitle);
    return safeLower(activity).startsWith('work')
      ? activity
      : `Work · ${activity}`;
  }

  return safeTitle;
}

export type EventInferenceInput = {
  title?: string | null;
  description?: string | null;
  location?: string | null;
  sourceCalendarName?: string;
  calendarSignals?: CalendarNameSignals;
  creator?: CalendarEventOrganizer;
  organizer?: CalendarEventOrganizer;
};

function mergeInferenceWithCalendar(
  base: EventInference,
  calendar?: CalendarNameSignals,
): EventInference {
  if (!calendar) return base;

  const result = { ...base, inferredPeople: [...base.inferredPeople] };

  const boostName = safeTrim(calendar.personBoost);
  if (boostName && isKnownPersonName(boostName)) {
    const boostKey = personKey(boostName);
    const exists = result.inferredPeople.some(
      (p) => personKey(p.name) === boostKey,
    );
    if (!exists) {
      result.inferredPeople.unshift({
        name: boostName,
        confidence: calendar.personConfidence,
      });
    }
  }

  if (calendar.categoryBoost) {
    if (!result.inferredCategory) {
      result.inferredCategory = calendar.categoryBoost;
      result.categoryConfidence = calendar.categoryConfidence;
    } else if (
      calendar.categoryConfidence === 'high' &&
      result.inferredCategory !== calendar.categoryBoost
    ) {
      result.inferredCategory = calendar.categoryBoost;
      result.categoryConfidence = 'high';
    }
  }

  if (calendar.communityBoost && !result.inferredCategory) {
    result.inferredCategory = 'personal';
    result.categoryConfidence = 'medium';
  }

  if (calendar.workBoost && !result.inferredCategory) {
    result.inferredCategory = 'work';
    result.categoryConfidence =
      result.categoryConfidence === 'high' ? 'high' : 'medium';
    result.inferredOwnerLabel = 'Work';
  }

  if (calendar.familyBoost || calendar.sportsBoost) {
    if (result.inferredCategory === 'family' || calendar.familyBoost) {
      if (calendar.sportsBoost || result.timingSensitivity === 'medium') {
        result.timingSensitivity = 'high';
      }
      if (result.peopleImpact === 'NONE') {
        result.peopleImpact = 'MEDIUM';
      }
    }
  }

  const highPerson = result.inferredPeople.find((p) => p.confidence === 'high');
  if (highPerson && result.inferredCategory) {
    result.confidence = 'high';
  }

  result.inferredPeople = result.inferredPeople.filter((p) =>
    isKnownPersonName(p.name),
  );

  return result;
}

export function inferFromEvent(input: EventInferenceInput): EventInference {
  const parts = [
    safeTrim(input.title),
    safeTrim(input.description),
    safeTrim(input.location),
  ].filter((p) => p.length > 0);
  const combined = parts.join(' ').trim();
  const base = inferFromEventTitle(combined || safeTrim(input.title));
  return mergeInferenceWithCalendar(base, input.calendarSignals);
}
