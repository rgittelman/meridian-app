import type { LifeObject } from '@/types/capture';
import type { Confidence } from '@/types/capture';
import type { MeridianCalendarEvent } from '@/types/calendar';
import type { CalendarRelationshipMatch, RelationshipType } from '@/types/relationships';
import { inferRelationshipType } from './inferRelationshipType';
import { safeLower, safeString, safeTrim } from '@/utils/safeString';

const PREP_SIGNALS = /\b(?:prep|prepare|review|deck|slides|before|ahead of)\b/i;
const BRING_SIGNALS = /\b(?:bring|skates|gear|uniform|equipment|pack)\b/i;
const PRINT_SIGNALS = /\b(?:print|forms?|registration|paperwork)\b/i;

const HIGH_THRESHOLD = 0.72;
const MEDIUM_THRESHOLD = 0.52;

function tokenize(text: string | null | undefined): Set<string> {
  return new Set(
    safeLower(text)
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2),
  );
}

function tokenOverlap(a: string | null | undefined, b: string | null | undefined): number {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.size === 0 || tb.size === 0) return 0;

  let shared = 0;
  for (const t of ta) {
    if (tb.has(t)) shared += 1;
  }
  return shared / Math.max(ta.size, tb.size);
}

function peopleMatchScore(capture: LifeObject, event: MeridianCalendarEvent): number {
  const capturePeople = capture.parse.people
    .map((p) => safeLower(p?.value))
    .filter((n) => n.length > 0);
  const eventPeople = (event.inferredPeople ?? [])
    .map((p) => safeLower(p?.name))
    .filter((n) => n.length > 0);
  if (capturePeople.length === 0 || eventPeople.length === 0) return 0;

  let best = 0;
  for (const cp of capturePeople) {
    for (const ep of eventPeople) {
      if (cp === ep || cp.includes(ep) || ep.includes(cp)) {
        best = Math.max(best, 1);
      } else if (tokenOverlap(cp, ep) > 0.5) {
        best = Math.max(best, 0.6);
      }
    }
  }
  return best;
}

function categoryMatchScore(capture: LifeObject, event: MeridianCalendarEvent): number {
  const cat = capture.parse.category?.value;
  if (!cat || !event.inferredCategory) return 0;
  if (cat === event.inferredCategory) return 0.35;
  if (cat === 'family' && event.inferredCategory === 'household') return 0.25;
  if (cat === 'work' && event.inferredCategory === 'work') return 0.4;
  return 0;
}

function calendarContextScore(capture: LifeObject, event: MeridianCalendarEvent): number {
  const text = safeLower(capture?.raw);
  const cal = safeLower(event?.sourceCalendarName);
  let score = 0;

  if (cal.includes('bfsc') && (text.includes('bfsc') || text.includes('board'))) {
    score += 0.45;
  }
  if (cal.includes('work') && (text.includes('budget') || text.includes('sales') || text.includes('meeting'))) {
    score += 0.35;
  }
  if (cal.includes('family') && capture.parse.category?.value === 'family') {
    score += 0.3;
  }

  for (const p of event.inferredPeople ?? []) {
    const personName = safeLower(p?.name);
    if (personName && text.includes(personName)) score += 0.35;
  }

  return Math.min(0.55, score);
}

function prepLanguageScore(capture: LifeObject, event: MeridianCalendarEvent): number {
  const text = safeLower(capture?.raw);
  const eventText = safeLower(
    `${safeString(event?.title)} ${safeString(event?.description)}`,
  );
  let score = 0;

  if (PREP_SIGNALS.test(text) && /\b(?:board|meeting|review|call)\b/i.test(eventText)) {
    score += 0.4;
  }
  if (BRING_SIGNALS.test(text) && /\b(?:hockey|soccer|practice|game)\b/i.test(eventText)) {
    score += 0.45;
  }
  if (PRINT_SIGNALS.test(text) && /\b(?:soccer|registration|school|forms)\b/i.test(eventText)) {
    score += 0.4;
  }

  if (text.includes('budget') && eventText.includes('budget')) score += 0.35;
  if (text.includes('board') && eventText.includes('board')) score += 0.35;
  if (text.includes('hudson') && eventText.includes('hudson')) score += 0.4;
  if (text.includes('grace') && eventText.includes('grace')) score += 0.4;
  if (text.includes('quinn') && eventText.includes('quinn')) score += 0.4;
  if (text.includes('skates') && eventText.includes('hockey')) score += 0.35;

  return Math.min(0.5, score);
}

function timingProximityScore(
  capture: LifeObject,
  event: MeridianCalendarEvent,
  now = Date.now(),
): number {
  const hoursUntil = (event.startTime.getTime() - now) / 3_600_000;
  if (hoursUntil < -2) return 0;

  const captureRaw = safeString(capture?.raw);
  const hasPrep = PREP_SIGNALS.test(captureRaw);
  const hasBring = BRING_SIGNALS.test(captureRaw);

  if (hasBring && hoursUntil >= 0 && hoursUntil <= 8) return 0.35;
  if (hasPrep && hoursUntil >= 0 && hoursUntil <= 48) return 0.3;
  if (capture.parse.timing && hoursUntil >= 0 && hoursUntil <= 72) return 0.2;
  if (hoursUntil >= 0 && hoursUntil <= 24) return 0.1;

  return 0;
}

function buildReason(
  capture: LifeObject,
  event: MeridianCalendarEvent,
  type: RelationshipType,
): string {
  const parts: string[] = [];
  const eventTitle = event.rawTitle ?? event.title ?? event.displayTitle;
  if (tokenOverlap(capture.title, eventTitle) > 0.25) parts.push('title');
  if (peopleMatchScore(capture, event) > 0) parts.push('people');
  if (calendarContextScore(capture, event) > 0) parts.push('calendar');
  if (prepLanguageScore(capture, event) > 0) parts.push('prep-language');
  parts.push(type);
  return parts.join('+');
}

export function scoreCaptureEventRelationship(
  capture: LifeObject,
  event: MeridianCalendarEvent,
  now = Date.now(),
): { score: number; confidence: Confidence; type: RelationshipType; reason: string } {
  const eventTitle = event.rawTitle ?? event.title ?? event.displayTitle ?? event.displayLabel;
  const titleScore = tokenOverlap(capture.raw, eventTitle) * 0.55;
  const peopleScore = peopleMatchScore(capture, event) * 0.35;
  const categoryScore = categoryMatchScore(capture, event);
  const calendarScore = calendarContextScore(capture, event);
  const prepScore = prepLanguageScore(capture, event);
  const timingScore = timingProximityScore(capture, event, now);

  const score = Math.min(
    1,
    titleScore + peopleScore + categoryScore + calendarScore + prepScore + timingScore,
  );

  const type = inferRelationshipType(capture, event);
  const reason = buildReason(capture, event, type);

  const confidence: Confidence =
    score >= HIGH_THRESHOLD ? 'high' : score >= MEDIUM_THRESHOLD ? 'medium' : 'low';

  return { score, confidence, type, reason };
}

export function scoreToConfidence(score: number): Confidence {
  if (score >= HIGH_THRESHOLD) return 'high';
  if (score >= MEDIUM_THRESHOLD) return 'medium';
  return 'low';
}

export function findBestCalendarMatch(
  capture: LifeObject,
  events: MeridianCalendarEvent[],
  now = Date.now(),
): CalendarRelationshipMatch | null {
  const candidates: CalendarRelationshipMatch[] = [];

  for (const event of events) {
    const { score, confidence, type, reason } = scoreCaptureEventRelationship(
      capture,
      event,
      now,
    );
    if (confidence === 'low') continue;

    candidates.push({
      calendarEventId: event.id,
      eventTitle: safeTrim(event.displayLabel, safeTrim(event.title, 'Event')),
      sourceCalendarName: safeTrim(event.sourceCalendarName, 'Calendar'),
      relationshipType: type,
      confidence,
      score,
      reason,
    });
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0];
}
