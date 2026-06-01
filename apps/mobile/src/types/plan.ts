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
};

/** Timeline row alias — same shape as PromotedPlanItem. */
export type PlanPromotedCapture = PromotedPlanItem;

export type PlanDayScheduleItem =
  | { kind: 'event'; startTime: Date; event: MeridianCalendarEvent }
  | { kind: 'capture'; startTime: Date; capture: PlanPromotedCapture };
