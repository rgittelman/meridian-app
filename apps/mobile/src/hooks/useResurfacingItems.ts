/**
 * Meridian — useResurfacingItems
 *
 * The primary hook for the Focus screen's intelligence layer.
 *
 * Pipeline:
 *   capture store items
 *     → filter: active, not dismissed
 *     → bridge: LifeObject → FocusItemData
 *     → timing window: is now the right moment?
 *     → resurfacing score: priority × timing × cooldown
 *     → group bonus: related items cluster together
 *     → sort: highest score first
 *     → cap: top MAX_ITEMS
 *     → insight: single ambient sentence (rarely)
 *
 * Cooldown stability: cooldowns are read from a ref, not included in memo deps.
 * This prevents markSurfaced() from causing an immediate re-sort on render.
 * Cooldown changes only affect resurfacing on the NEXT capture-driven re-run.
 *
 * Falls back to empty when no captures exist (caller shows mock scenario).
 */

import { useMemo, useEffect, useRef } from 'react';

import { useCaptureStore } from '@/store/captureStore';
import { computeEventLinkedBoost } from '@/services/resurfacing/eventLinkedBoost';
import type { LifeIntelligenceSnapshot } from '@/types/life';
import type { LifeObject } from '@/types/capture';
import { logEventLinkedResurfacing } from '@/services/calendar/calendarIntelligenceDebug';
import type { MeridianCalendarEvent } from '@/types/calendar';
import { useResurfacingStore } from '@/store/resurfacingStore';
import { isChildMorningCommitment } from '@/services/resurfacing/childMorningCommitment';
import { shouldSurfaceRecurringCapture } from '@/services/resurfacing/recurringSurface';
import {
  bridgeLifeObject,
  computeGroupBonus,
  generateInsight,
  getTimingWindow,
  scoreForResurfacing,
} from '@/services/resurfacing';
import { FOCUS_MAX } from '@/constants/focus';
import { planFocusScoreBoost } from '@/services/plan/planFocusBoost';
import { deriveVisualUrgency } from '@/services/priority/deriveVisualUrgency';
import { usePlanPromotionStore } from '@/store/planPromotionStore';
import type { OverloadState } from '@/services/priority/types';
import type { CooldownEntry, ResurfacedItem, ResurfacingResult } from '@/services/resurfacing/types';

/** Constitutional Focus cap — never exceed FOCUS_MAX */
const MAX_ITEMS = FOCUS_MAX;

const DUE_WINDOW_RANK: Record<string, number> = {
  OVERDUE: 0,
  NOW: 1,
  TODAY: 2,
  TOMORROW: 3,
  THIS_WEEK: 4,
  LATER: 5,
};

/** When cooldown/score filters remove everything, still show real captures. */
function buildFallbackResurfaced(
  bridged: Array<{
    obj: LifeObject;
    focusData: ReturnType<typeof bridgeLifeObject>;
    ageHours: number;
  }>,
  eventById: Map<string, MeridianCalendarEvent>,
  currentHour: number,
  max: number,
): ResurfacedItem[] {
  const ranked = [...bridged].sort((a, b) => {
    const linkedA = a.obj.linkedCalendarEventId
      ? eventById.get(a.obj.linkedCalendarEventId)
      : undefined;
    const linkedB = b.obj.linkedCalendarEventId
      ? eventById.get(b.obj.linkedCalendarEventId)
      : undefined;
    const childA = isChildMorningCommitment(a.obj, linkedA) ? 1 : 0;
    const childB = isChildMorningCommitment(b.obj, linkedB) ? 1 : 0;
    if (childB !== childA) return childB - childA;

    const dueA = DUE_WINDOW_RANK[a.focusData.intelligence.dueWindow] ?? 9;
    const dueB = DUE_WINDOW_RANK[b.focusData.intelligence.dueWindow] ?? 9;
    if (dueA !== dueB) return dueA - dueB;

    return b.obj.momentumValue - a.obj.momentumValue;
  });

  return ranked.slice(0, max).map(({ obj, focusData, ageHours }) => {
    const linkedEvent = obj.linkedCalendarEventId
      ? eventById.get(obj.linkedCalendarEventId)
      : undefined;
    const timingWindow = getTimingWindow({
      dueWindow: focusData.intelligence.dueWindow,
      currentHour,
      isFamilyCommitment: focusData.intelligence.isFamilyCommitment ?? false,
      isFinancial: focusData.intelligence.isFinancial ?? false,
      isStressPrevention: focusData.intelligence.isStressPrevention ?? false,
      hasPeople: obj.parse.people.length > 0,
      isChildMorningCommitment: isChildMorningCommitment(obj, linkedEvent),
      ageHours,
    });

    return {
      id: focusData.id,
      title: focusData.title,
      person: focusData.person,
      time: focusData.time,
      timingWindow,
      resurfacingScore: Math.max(0.35, obj.momentumValue),
      group: null,
      reappearanceHint: null,
      visualUrgency: deriveVisualUrgency(focusData),
    };
  });
}

type UseResurfacingItemsOptions = {
  overloadState?: OverloadState;
  calendarEvents?: MeridianCalendarEvent[];
  lifeSnapshot?: LifeIntelligenceSnapshot | null;
};

/**
 * Runs the full resurfacing pipeline and returns sorted ResurfacedItems
 * plus an optional ambient insight sentence.
 */
export function useResurfacingItems(
  options: UseResurfacingItemsOptions = {},
): ResurfacingResult {
  const {
    overloadState = 'MEDIUM',
    calendarEvents = [],
    lifeSnapshot = null,
  } = options;

  const captureItems = useCaptureStore((s) => s.items);
  const statusByCaptureId = usePlanPromotionStore((s) => s.statusByCaptureId);
  const { cooldowns, dismissedIds, lastInsight, markSurfaced, setLastInsight } =
    useResurfacingStore();

  // Stable ref for cooldowns — avoids feedback loop where markSurfaced
  // causes the memo to re-run and immediately re-shuffle the displayed items.
  // Cooldowns are read at compute time via the ref; updates from markSurfaced
  // are invisible to the memo until the next capture-driven re-run.
  const cooldownsRef = useRef<Record<string, CooldownEntry>>(cooldowns);
  const lastInsightRef = useRef(lastInsight);
  useEffect(() => {
    cooldownsRef.current = cooldowns;
  }, [cooldowns]);
  useEffect(() => {
    lastInsightRef.current = lastInsight;
  }, [lastInsight]);

  const result = useMemo<ResurfacingResult>(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentCooldowns = cooldownsRef.current;

    // Filter: only active captures, not dismissed
    const activeItems = captureItems.filter(
      (item) =>
        item.status !== 'done' &&
        item.status !== 'archived' &&
        !dismissedIds.includes(item.id),
    );

    if (activeItems.length === 0) {
      return { items: [], insight: null };
    }

    // Bridge: LifeObject → FocusItemData
    const eventById = new Map(calendarEvents.map((e) => [e.id, e]));

    const bridged = activeItems.map((obj) => ({
      obj,
      focusData: bridgeLifeObject(
        obj,
        obj.linkedCalendarEventId
          ? eventById.get(obj.linkedCalendarEventId)
          : undefined,
      ),
      ageHours: (Date.now() - obj.createdAt.getTime()) / (1000 * 60 * 60),
    }));

    // Build context map for group bonus computation
    const contextMap = new Map<string, string[]>();
    for (const { obj, focusData } of bridged) {
      const contexts = obj.parse.relatedContexts.map((r) => r.label);
      if (contexts.length > 0) {
        contextMap.set(focusData.id, contexts);
      }
    }

    // First pass: score each item (without group bonus)
    const firstPass = bridged.map(({ obj, focusData, ageHours }) => {
      const intel = focusData.intelligence;
      const linkedEvent = obj.linkedCalendarEventId
        ? eventById.get(obj.linkedCalendarEventId)
        : undefined;
      const childMorning = isChildMorningCommitment(obj, linkedEvent);

      const timingWindow = getTimingWindow({
        dueWindow: intel.dueWindow,
        currentHour,
        isFamilyCommitment: intel.isFamilyCommitment ?? false,
        isFinancial: intel.isFinancial ?? false,
        isStressPrevention: intel.isStressPrevention ?? false,
        hasPeople: obj.parse.people.length > 0,
        isChildMorningCommitment: childMorning,
        ageHours,
      });

      const { resurfacingScore, isSuppressed, reappearanceHint } = scoreForResurfacing({
        item: focusData,
        timingWindow,
        cooldowns: currentCooldowns,
        overloadState,
        ageHours,
      });

      return { focusData, timingWindow, resurfacingScore, isSuppressed, reappearanceHint };
    });

    // Remove suppressed items (defer/snooze only — see scoreResurfacing)
    let eligible = firstPass.filter((r) => !r.isSuppressed);

    // Identify preliminary top set for group bonus
    let preSort = [...eligible].sort((a, b) => b.resurfacingScore - a.resurfacingScore);

    // Real captures exist but timing/cooldown zeroed the stack — never return empty
    if (preSort.length === 0 && bridged.length > 0) {
      const fallback = buildFallbackResurfaced(
        bridged,
        eventById,
        currentHour,
        MAX_ITEMS,
      );
      return { items: fallback, insight: null };
    }
    const topIds = new Set(preSort.slice(0, 3).map((r) => r.focusData.id));

    // Second pass: apply group bonus, resolve cluster label
    const objById = new Map(bridged.map((b) => [b.obj.id, b.obj]));

    const scored = eligible.map((r) => {
      const groupBonus = computeGroupBonus(r.focusData.id, contextMap, topIds);
      const sourceObj = objById.get(r.focusData.id);
      const eventBoost =
        sourceObj && calendarEvents.length > 0
          ? computeEventLinkedBoost(sourceObj, calendarEvents)
          : 0;
      const planBoost =
        sourceObj
          ? planFocusScoreBoost(
              sourceObj,
              statusByCaptureId[sourceObj.id] ?? 'active',
              now,
            )
          : 0;
      const finalScore = Math.min(1, r.resurfacingScore + groupBonus + eventBoost + planBoost);

      let group: string | null = null;
      const myContexts = contextMap.get(r.focusData.id) ?? [];
      if (myContexts.length > 0) {
        for (const [otherId, otherContexts] of contextMap) {
          if (otherId !== r.focusData.id && topIds.has(otherId)) {
            const shared = myContexts.find((c) => otherContexts.includes(c));
            if (shared) { group = shared; break; }
          }
        }
      }

      return { ...r, resurfacingScore: finalScore, group };
    });

    // Sort by final score descending
    scored.sort((a, b) => b.resurfacingScore - a.resurfacingScore);

    // Cap at MAX_ITEMS
    const topItems = scored.slice(0, MAX_ITEMS);

    // Map to ResurfacedItem
    const resurfacedItems: ResurfacedItem[] = topItems.map((r) => ({
      id: r.focusData.id,
      title: r.focusData.title,
      person: r.focusData.person,
      time: r.focusData.time,
      timingWindow: r.timingWindow,
      resurfacingScore: r.resurfacingScore,
      group: r.group,
      reappearanceHint: r.reappearanceHint,
      visualUrgency: deriveVisualUrgency(r.focusData),
    }));

    const insight = generateInsight({
      items: resurfacedItems,
      currentHour,
      lastInsight,
    });

    if (__DEV__ && calendarEvents.length > 0) {
      const linkedIds = new Set(
        captureItems
          .filter((i) => i.linkedCalendarEventId)
          .map((i) => i.id),
      );
      logEventLinkedResurfacing(resurfacedItems, linkedIds);
    }

    return { items: resurfacedItems, insight };
    // NOTE: cooldowns intentionally excluded from deps — see stability note above
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captureItems, dismissedIds, overloadState, calendarEvents, lifeSnapshot, statusByCaptureId]);

  // Mark top items as surfaced — deferred so the memo result stabilizes first
  useEffect(() => {
    if (result.items.length === 0) return;
    const ids = result.items.slice(0, 3).map((i) => i.id);
    // Small delay ensures UI paint completes before we update store
    const timer = setTimeout(() => {
      for (const id of ids) markSurfaced(id);
    }, 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.items.map((i) => i.id).join(',')]);

  // Persist insight outside render — never call setLastInsight during useMemo/render
  useEffect(() => {
    const nextInsight = result.insight;
    if (nextInsight === lastInsight) return;
    setLastInsight(nextInsight);
  }, [result.insight, lastInsight, setLastInsight]);

  return result;
}
