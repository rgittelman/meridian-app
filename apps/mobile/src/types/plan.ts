import type { Confidence } from '@/types/capture';
import type { MeridianCalendarEvent } from '@/types/calendar';
import type { LifeDomainId } from '@/types/life';

/** Meridian-internal plan layer — never written to Google Calendar. */
export type PromotedPlanItemStatus = 'active' | 'handled' | 'held' | 'dismissed';

/**
 * A capture promoted into Plan because it has high-confidence timing
 * with a resolvable schedule — visually softer than calendar events.
 */
export type PromotedPlanItem = {
  id: string;
  sourceCaptureId: string;
  title: string;
  originalText: string;
  plannedStartTime: Date;
  plannedEndTime?: Date | null;
  inferredPeople: string[];
  inferredDomain: LifeDomainId;
  timingConfidence: Confidence;
  promotionReason: string;
  sourceType: 'capture';
  status: PromotedPlanItemStatus;
  displayTime: string;
  timingLabel: string;
  isApproximate: boolean;
  personLabel: string | null;
  /** Parsed place phrase — not a calendar venue */
  location: string | null;
  /**
   * Placement resolution tier:
   * - 'exact'    — high-confidence day + clock time (may still be approximate if fuzzy).
   * - 'soft_day' — day-level only; plannedStartTime defaults to 09:00 as a placeholder.
   *
   * Soft-day captures span the full day and must NOT be expired by a clock-time check.
   */
  placementTier: 'exact' | 'soft_day';
};

/** Timeline row alias — same shape as PromotedPlanItem. */
export type PlanPromotedCapture = PromotedPlanItem;

export type PlanDayScheduleItem =
  | { kind: 'event'; startTime: Date; event: MeridianCalendarEvent }
  | { kind: 'capture'; startTime: Date; capture: PlanPromotedCapture };
