/**
 * Meridian — useNotificationBriefScheduler
 *
 * Phase F: forward-schedules Morning Brief (7:15 AM) and Evening Preview (7:00 PM)
 * based on the latest available calendar state.
 *
 * Design:
 * - Runs on mount and whenever calendar sync completes (syncVersion increments).
 * - Builds content using bypassDeliveryWindow so it works outside the time windows.
 * - Schedules at a specific OS trigger time (scheduledFor override).
 * - Duplicate prevention is handled by the existing scheduler dedup gate —
 *   same bundleKey + targetWindowStart = same day = one notification max.
 * - Content reflects the calendar state at schedule time (last app open).
 *   Stale-content risk is accepted for V1; Phase I (Background Fetch) will fix it.
 *
 * Not doing:
 * - Background fetch
 * - Geolocation
 * - Traffic-aware timing
 * - AI summaries
 */

import { useEffect } from 'react';
import { nanoid } from 'nanoid/non-secure';

import { ExpoNotificationDeliveryScheduler } from '@/services/notifications/delivery';
import { getNotificationPermissionState } from '@/services/notifications/delivery/notificationPermissions';
import {
  buildMorningBriefContent,
  buildEveningPreviewContent,
} from '@/services/notifications/buildBriefContent';
import type { ApprovedNotificationBundle } from '@/types/notificationDelivery';
import { useCalendarStore } from '@/store/calendarStore';
import { useNotificationSettingsStore } from '@/store/notificationSettingsStore';

// ── Target times ──────────────────────────────────────────────────────────────

const MORNING_BRIEF_HOUR = 7;
const MORNING_BRIEF_MINUTE = 15;
const EVENING_PREVIEW_HOUR = 19;
const EVENING_PREVIEW_MINUTE = 0;

/** Returns the next occurrence of a given local hour:minute (today or tomorrow). */
function nextOccurrenceAt(hour: number, minute: number, now: Date): Date {
  const target = new Date(now);
  target.setHours(hour, minute, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return target;
}

/** YYYY-MM-DD of a Date, used for stable bundle keys. */
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Singleton scheduler ───────────────────────────────────────────────────────

const scheduler = new ExpoNotificationDeliveryScheduler();

// ── Core schedule function ────────────────────────────────────────────────────

async function scheduleBriefs(): Promise<void> {
  const settings = useNotificationSettingsStore.getState();
  if (!settings.enabled) return;

  const permission = await getNotificationPermissionState();
  if (permission !== 'granted' && permission !== 'provisional') return;

  const { weekEvents, upcomingEvents } = useCalendarStore.getState();
  // Deduplicate events by id before building content
  const seen = new Set<string>();
  const allEvents = [...weekEvents, ...upcomingEvents].filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });

  const now = new Date();

  // ── Morning Brief ───────────────────────────────────────────────────────────
  if (settings.morningBriefEnabled) {
    const morningTarget = nextOccurrenceAt(MORNING_BRIEF_HOUR, MORNING_BRIEF_MINUTE, now);
    const morningKey = dateKey(morningTarget);
    const content = buildMorningBriefContent(allEvents, now);

    if (content) {
      const bundle: ApprovedNotificationBundle = {
        id: nanoid(),
        bundleKey: `morning-brief-scheduled-${morningKey}`,
        type: 'morning_brief',
        candidateIds: [],
        title: content.notificationTitle,
        lines: content.lines,
        decision: 'send',
        suppressionReason: null,
        interruptionReason: 'Orient to the shape of the day ahead.',
        targetWindowStart: morningTarget,
        targetWindowEnd: new Date(morningTarget.getTime() + 30 * 60_000),
        householdImpact: 'medium',
        interruptionScore: {
          total: 55,
          householdImpact: 15,
          timingSensitivity: 10,
          conflictRisk: 0,
          prepRelevance: 0,
          peopleImpact: 15,
          confidence: 15,
        },
      };

      const result = await scheduler.scheduleApprovedBundle(bundle, { scheduledFor: morningTarget });
      if (__DEV__) {
        if (result.ok) {
          console.log('[BriefScheduler] Morning Brief scheduled for', morningTarget.toISOString());
        } else {
          console.log('[BriefScheduler] Morning Brief skipped:', result.reason);
        }
      }
    }
  }

  // ── Evening Preview ─────────────────────────────────────────────────────────
  if (settings.eveningPreviewEnabled) {
    const eveningTarget = nextOccurrenceAt(EVENING_PREVIEW_HOUR, EVENING_PREVIEW_MINUTE, now);
    const eveningKey = dateKey(eveningTarget);
    const content = buildEveningPreviewContent(allEvents, now);

    if (content) {
      const bundle: ApprovedNotificationBundle = {
        id: nanoid(),
        bundleKey: `evening-preview-scheduled-${eveningKey}`,
        type: 'evening_wind_down',
        candidateIds: [],
        title: content.notificationTitle,
        lines: content.lines,
        decision: 'send',
        suppressionReason: null,
        interruptionReason: 'Reduce pressure before tomorrow.',
        targetWindowStart: eveningTarget,
        targetWindowEnd: new Date(eveningTarget.getTime() + 30 * 60_000),
        householdImpact: 'medium',
        interruptionScore: {
          total: 50,
          householdImpact: 12,
          timingSensitivity: 10,
          conflictRisk: 0,
          prepRelevance: 0,
          peopleImpact: 13,
          confidence: 15,
        },
      };

      const result = await scheduler.scheduleApprovedBundle(bundle, { scheduledFor: eveningTarget });
      if (__DEV__) {
        if (result.ok) {
          console.log('[BriefScheduler] Evening Preview scheduled for', eveningTarget.toISOString());
        } else {
          console.log('[BriefScheduler] Evening Preview skipped:', result.reason);
        }
      }
    }
  }
}

// ── Dev-only fast-fire helper ─────────────────────────────────────────────────

/**
 * DEV ONLY — schedules a morning brief or evening preview N seconds from now
 * using a dev-specific bundle key so the dedup gate does not block it.
 * Does NOT respect the 7:15 AM / 7:00 PM targets.
 * Does NOT affect production scheduling behavior in any way.
 */
export async function scheduleBriefDevTest(
  type: 'morning' | 'evening',
  delaySeconds: number,
): Promise<{ ok: boolean; reason?: string; fireAt?: Date }> {
  if (!__DEV__) return { ok: false, reason: 'not_dev' };

  const permission = await getNotificationPermissionState();
  if (permission !== 'granted' && permission !== 'provisional') {
    return { ok: false, reason: `permission_${permission}` };
  }

  const { weekEvents, upcomingEvents } = useCalendarStore.getState();
  const seen = new Set<string>();
  const allEvents = [...weekEvents, ...upcomingEvents].filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });

  const now = new Date();
  const content =
    type === 'morning'
      ? buildMorningBriefContent(allEvents, now)
      : buildEveningPreviewContent(allEvents, now);

  if (!content) return { ok: false, reason: 'no_content' };

  const fireAt = new Date(now.getTime() + delaySeconds * 1000);

  const bundle: ApprovedNotificationBundle = {
    id: nanoid(),
    // Dev-specific key — never collides with real brief keys
    bundleKey: `dev-brief-${type}-${Date.now()}`,
    type: type === 'morning' ? 'morning_brief' : 'evening_wind_down',
    candidateIds: [],
    title: content.notificationTitle,
    lines: content.lines,
    decision: 'send',
    suppressionReason: null,
    interruptionReason: `Dev test — ${type} brief.`,
    targetWindowStart: fireAt,
    targetWindowEnd: new Date(fireAt.getTime() + 5 * 60_000),
    householdImpact: 'medium',
    interruptionScore: {
      total: 55,
      householdImpact: 15,
      timingSensitivity: 10,
      conflictRisk: 0,
      prepRelevance: 0,
      peopleImpact: 15,
      confidence: 15,
    },
  };

  const result = await scheduler.scheduleApprovedBundle(bundle, { scheduledFor: fireAt });
  if (result.ok) return { ok: true, fireAt };
  return { ok: false, reason: result.reason };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useNotificationBriefScheduler(): void {
  // Re-run whenever calendar sync completes — picks up event changes.
  const syncVersion = useCalendarStore((s) => s.syncVersion);
  useEffect(() => {
    if (syncVersion === 0) return; // skip initial mount (no sync yet)
    void scheduleBriefs();
  }, [syncVersion]);

  // Fire once when the calendar store first has data — covers the mount-timing
  // race where scheduleBriefs() ran at mount before the store hydrated from
  // AsyncStorage cache. This false→true transition fires exactly once per
  // session and acts as the safety net when syncVersion stays at 0 (offline /
  // cached-only session).
  const hasCalendarData = useCalendarStore(
    (s) => s.weekEvents.length > 0 || s.upcomingEvents.length > 0,
  );
  useEffect(() => {
    if (!hasCalendarData) return;
    void scheduleBriefs();
  }, [hasCalendarData]);
}
