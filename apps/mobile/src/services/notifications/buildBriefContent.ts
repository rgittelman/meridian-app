/**
 * Pure brief content builder — Phase F.
 *
 * Produces notification copy for Morning Brief and Evening Preview.
 * No intelligence decisions happen here — this is copy synthesis only.
 *
 * Copy standard (from Codemaster):
 *   - Calm, specific, never generic
 *   - Family before work
 *   - Never guilt, never unfinished-task language
 *   - Names commitments specifically when possible
 *
 * These functions are called by the brief scheduler to build forward-scheduled
 * bundle content, and by useDailyBrief to populate the Focus card.
 */

import type { MeridianCalendarEvent } from '@/types/calendar';
import { commitmentBriefLine } from './candidateHelpers';
import { isHouseholdRelevant } from '@/services/relevance';

// ── Domain helpers ────────────────────────────────────────────────────────────

function isFamilyOrCommunity(event: MeridianCalendarEvent): boolean {
  const domain = event.attribution?.inferredDomain ?? event.inferredLifeDomain;
  return domain === 'family' || domain === 'community';
}

function isWork(event: MeridianCalendarEvent): boolean {
  const domain = event.attribution?.inferredDomain ?? event.inferredLifeDomain;
  return domain === 'work';
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function eventsForDate(events: MeridianCalendarEvent[], day: Date): MeridianCalendarEvent[] {
  const key = startOfDay(day).toISOString();
  return events
    .filter(
      (e) =>
        !e.allDay &&
        startOfDay(e.startTime).toISOString() === key &&
        e.signalClassification === 'meaningful' &&
        isHouseholdRelevant(e),
    )
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}

// ── Copy types ────────────────────────────────────────────────────────────────

export type BriefContent = {
  type: 'morning' | 'evening';
  /** OS notification title */
  notificationTitle: string;
  /** Primary summary line — describes the shape of the day */
  primaryLine: string;
  /** Specific commitment lines — up to 3 */
  commitmentLines: string[];
  /** All lines joined for Focus card display */
  lines: string[];
};

// ── Morning Brief ─────────────────────────────────────────────────────────────

/**
 * Synthesises morning brief copy from today's (and optionally tomorrow's) events.
 * Returns null when there is no meaningful content to surface.
 */
export function buildMorningBriefContent(
  events: MeridianCalendarEvent[],
  now: Date,
): BriefContent | null {
  const today = startOfDay(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayEvents = eventsForDate(events, today);
  const tomorrowEvents = eventsForDate(events, tomorrow);

  // Need at least one meaningful event to show a brief
  if (todayEvents.length === 0 && tomorrowEvents.length === 0) return null;

  const familyEvents = todayEvents.filter(isFamilyOrCommunity);
  const workEvents = todayEvents.filter(isWork);

  // Synthesise a shape line that names the day's character — family first.
  let primaryLine: string;

  if (todayEvents.length === 0 && tomorrowEvents.length > 0) {
    // Nothing today, but something tomorrow — look ahead
    primaryLine = 'A clear day today. Something on the calendar tomorrow.';
  } else if (familyEvents.length >= 2 && workEvents.length > 0) {
    primaryLine = `${familyEvents.length} family commitments today. Work has breathing room.`;
  } else if (familyEvents.length >= 2) {
    primaryLine = `${familyEvents.length} family commitments today.`;
  } else if (familyEvents.length === 1 && workEvents.length >= 2) {
    primaryLine = 'Family first today. Work has a few things after.';
  } else if (familyEvents.length === 1 && workEvents.length === 1) {
    primaryLine = 'One family commitment and one work item today.';
  } else if (familyEvents.length === 1) {
    primaryLine = 'One family commitment today.';
  } else if (todayEvents.length === 1) {
    primaryLine = 'A lighter day. One commitment and space around it.';
  } else if (workEvents.length > 0 && familyEvents.length === 0) {
    primaryLine = 'Work-focused day. Breathing room if you need it.';
  } else {
    primaryLine = 'A few commitments today.';
  }

  // Specific commitment lines — family first, up to 3
  const ordered = [...familyEvents, ...workEvents.slice(0, Math.max(0, 3 - familyEvents.length))];
  const commitmentLines = ordered.slice(0, 3).map(commitmentBriefLine);

  const lines = [primaryLine, ...commitmentLines];

  return {
    type: 'morning',
    notificationTitle: 'Good morning',
    primaryLine,
    commitmentLines,
    lines,
  };
}

// ── Evening Preview ───────────────────────────────────────────────────────────

/**
 * Synthesises evening preview copy from tomorrow's events.
 * Returns null when tomorrow has no meaningful content.
 */
export function buildEveningPreviewContent(
  events: MeridianCalendarEvent[],
  now: Date,
): BriefContent | null {
  const tomorrow = new Date(startOfDay(now));
  tomorrow.setDate(tomorrow.getDate() + 1);

  const tomorrowEvents = eventsForDate(events, tomorrow);
  if (tomorrowEvents.length === 0) return null;

  const familyEvents = tomorrowEvents.filter(isFamilyOrCommunity);
  const workEvents = tomorrowEvents.filter(isWork);

  let primaryLine: string;

  if (tomorrowEvents.length >= 4) {
    primaryLine = 'Tomorrow is a full day. One small thing tonight may ease the morning.';
  } else if (familyEvents.length >= 2) {
    primaryLine = `Tomorrow starts with ${familyEvents.length} family commitments.`;
  } else if (familyEvents.length === 1) {
    const first = familyEvents[0];
    const title = first.displayTitle ?? first.title;
    primaryLine = `Tomorrow starts with ${title}.`;
  } else if (tomorrowEvents.length === 1) {
    primaryLine = 'One commitment tomorrow. The rest looks open.';
  } else {
    primaryLine = 'A few commitments tomorrow.';
  }

  const ordered = [...familyEvents, ...workEvents.slice(0, Math.max(0, 3 - familyEvents.length))];
  const commitmentLines = ordered.slice(0, 3).map(commitmentBriefLine);

  const lines = [primaryLine, ...commitmentLines];

  return {
    type: 'evening',
    notificationTitle: 'Good evening',
    primaryLine,
    commitmentLines,
    lines,
  };
}
