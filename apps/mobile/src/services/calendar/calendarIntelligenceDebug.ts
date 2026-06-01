import type { MeridianCalendarEvent } from '@/types/calendar';
import type { CalendarSyncDiagnostics } from '@/types/calendar';
import type { CalendarRelationshipMatch } from '@/types/relationships';
import type { LifeObject } from '@/types/capture';
import type { ResurfacedItem } from '@/services/resurfacing/types';
import type { CalendarCaptureIndex } from '@/services/relationships/calendarCaptureIndex';

export function logCalendarIntelligenceSummary(
  rawCount: number,
  normalized: MeridianCalendarEvent[],
  dedupedCount?: number,
  sync?: CalendarSyncDiagnostics,
): void {
  if (!__DEV__) return;

  const byDay = new Map<string, number>();
  for (const e of normalized) {
    const key = e.startTime.toDateString();
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }

  console.log('[Calendar Intelligence] ─── summary ───');
  if (sync) {
    console.log('[Calendar Intelligence] calendars fetched:', sync.calendarsFetched);
    console.log('[Calendar Intelligence] calendars skipped:', sync.calendarsSkipped);
    console.log('[Calendar Intelligence] calendars failed:', sync.calendarsFailed);
    if (sync.failedCalendarIds.length > 0) {
      console.log('[Calendar Intelligence] failed ids:', sync.failedCalendarIds);
    }
  }
  console.log('[Calendar Intelligence] raw fetched:', rawCount);
  console.log('[Calendar Intelligence] normalized:', normalized.length);
  if (dedupedCount !== undefined) {
    console.log('[Calendar Intelligence] deduped:', dedupedCount);
  }
  console.log('[Calendar Intelligence] plan days with events:', byDay.size);

  for (const e of normalized.slice(0, 12)) {
    console.log('[Calendar Intelligence] event', {
      label: e.displayLabel,
      calendar: e.sourceCalendarName,
      time: e.displayTime,
      owner: e.inferredOwnerLabel,
      category: e.inferredCategory,
      confidence: e.confidence,
    });
  }
}

export function logFocusUpcomingSelection(selected: MeridianCalendarEvent[]): void {
  if (!__DEV__) return;

  console.log('[Calendar Intelligence] Focus Coming Up selected:', selected.length);
  for (const e of selected) {
    console.log('[Calendar Intelligence] focus pick', {
      label: e.displayLabel,
      time: e.displayTime,
      calendar: e.sourceCalendarName,
    });
  }
}

export function logRelationshipMatch(
  captureText: string,
  candidates: Array<{ eventTitle: string; score: number; confidence: string }>,
  selected: CalendarRelationshipMatch | null,
): void {
  if (!__DEV__) return;

  console.log('[Calendar Intelligence] relationship match', {
    capture: captureText.slice(0, 80),
    candidates: candidates.slice(0, 5),
    selected: selected
      ? {
          event: selected.eventTitle,
          type: selected.relationshipType,
          confidence: selected.confidence,
          score: selected.score,
          reason: selected.reason,
        }
      : null,
  });
}

export function logEventLinkedResurfacing(
  items: ResurfacedItem[],
  linkedIds: Set<string>,
): void {
  if (!__DEV__) return;

  const linked = items.filter((i) => linkedIds.has(i.id));
  console.log('[Calendar Intelligence] event-linked resurfaced:', linked.length);
  for (const i of linked) {
    console.log('[Calendar Intelligence] resurfaced link', { title: i.title, time: i.time });
  }
}

export function logDeferredRelink(count: number, matched: number): void {
  if (!__DEV__) return;
  console.log('[Calendar Intelligence] deferred relink', { captures: count, matched });
}

export function logSignalQualityDiagnostics(diagnostics: Record<string, number>): void {
  if (!__DEV__) return;
  console.log('[Calendar Intelligence] ─── signal quality ───');
  console.log('[Calendar Intelligence]', diagnostics);
}

export function logCaptureRelationshipIndex(index: CalendarCaptureIndex): void {
  if (!__DEV__) return;

  const linkedEvents = index.byEventId.size;
  const prepEvents = index.prepByEventId.size;
  const withPrimary = index.primaryCaptureIdByEventId.size;

  console.log('[Calendar Intelligence] capture index', {
    linkableEvents: index.eventsById.size,
    linkedEvents,
    prepEvents,
    eventsWithPrimaryCapture: withPrimary,
    reverseLinks: index.eventIdByCaptureId.size,
    resolvedLinks: index.resolvedLinks.length,
  });

  for (const [eventId, captureId] of index.primaryCaptureIdByEventId) {
    const prepCount = index.prepCountByEventId.get(eventId) ?? 0;
    console.log('[Calendar Intelligence] relatedLifeObject', {
      eventId,
      relatedLifeObjectId: captureId,
      prepCount,
    });
  }
}
