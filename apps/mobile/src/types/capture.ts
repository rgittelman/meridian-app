/**
 * Meridian Capture — domain types.
 *
 * Everything the user throws at Meridian becomes a LifeObject.
 * Users do NOT manually classify. Meridian absorbs the organizational burden.
 */
import type { EmotionalWeight, ItemCategory, UrgencyLevel } from '@/services/priority/types';
import type { RelationshipSource, RelationshipType } from '@/types/relationships';

// ── Confidence scoring — humility first ──────────────────────────────────────

export type Confidence = 'high' | 'medium' | 'low';

/**
 * A field extracted by a parser. Always carries the source substring
 * so the extraction can be explained or corrected later.
 */
export type ParsedField<T> = {
  value: T;
  confidence: Confidence;
  /** The raw text fragment that triggered this extraction */
  source: string;
};

// ── Capture parse result ──────────────────────────────────────────────────────

export type TimingHint = {
  label: string;
  /** ISO string if we can derive one — future use */
  isoHint?: string;
};

/**
 * A detected contextual relationship — prep chains, clusters, recurring patterns.
 * Used to surface quietly intelligent connections without exposing graph logic.
 */
export type RelatedContext = {
  /** Human-readable label: "board prep", "swim season", "school logistics" */
  label: string;
  confidence: Confidence;
};

export type RecurrenceCadence = 'weekly' | 'daily' | 'monthly';

/** Recurring commitment schedule inferred from capture language. */
export type LifeObjectRecurrence = {
  cadence: RecurrenceCadence;
  /** 0 = Sunday … 6 = Saturday; empty = anchor to capture day */
  daysOfWeek: number[];
  label: string;
};

export type CaptureParseResult = {
  raw: string;
  /** Named people detected */
  people: ParsedField<string>[];
  /** Timing / due signal, if present */
  timing: ParsedField<TimingHint> | null;
  /** Place phrase after "in …" when present */
  location: ParsedField<string> | null;
  /** Inferred item category */
  category: ParsedField<ItemCategory> | null;
  /** Urgency signal derived from language */
  urgency: ParsedField<UrgencyLevel> | null;
  /** Emotional weight inferred from phrasing + context */
  emotionalWeight: ParsedField<EmotionalWeight> | null;
  /** True if the text implies a scheduling action */
  schedulingIntent: boolean;
  /** True if the text suggests a recurring pattern */
  isRoutine: boolean;
  /** Structured recurrence when language is explicit (every Monday, weekly, etc.) */
  recurrence: ParsedField<LifeObjectRecurrence> | null;
  /** Detected contextual relationships — prep chains, clusters, recurring patterns */
  relatedContexts: RelatedContext[];
};

// ── Life Object — unified capture output ──────────────────────────────────────

export type LifeObjectStatus =
  | 'captured'   // just entered — not yet clarified
  | 'clarifying' // AI/system processing
  | 'active'     // in circulation (on Focus, Plan, etc.)
  | 'done'
  | 'archived';

export type ObjectType = 'task' | 'reminder' | 'event' | 'note' | 'goal';

/**
 * The central unit of everything in Meridian.
 * Tasks, reminders, events, goals — all LifeObjects.
 */
export type LifeObject = {
  id: string;
  raw: string;
  /** Cleaned, display-ready title derived from raw input */
  title: string;
  /** Inferred structural type of this capture */
  objectType: ObjectType;
  createdAt: Date;
  status: LifeObjectStatus;
  parse: CaptureParseResult;
  /**
   * Mental-relief momentum score (0–1).
   * Reflects how much completing this item will reduce cognitive load.
   * Higher = more impactful to resolve.
   */
  momentumValue: number;

  /** Calendar relationship — set by automatic matching, not manual tagging */
  linkedCalendarEventId?: string | null;
  linkedCalendarEventTitle?: string | null;
  linkedCalendarEventSourceCalendar?: string | null;
  relationshipType?: RelationshipType | null;
  relationshipConfidence?: Confidence | null;
  relationshipReason?: string | null;
  relationshipCreatedAt?: Date | null;
  relationshipSource?: RelationshipSource | null;

  /** Recurring schedule — resurfacing respects daysOfWeek automatically */
  recurrence?: LifeObjectRecurrence | null;
};

// ── Capture store state surface ───────────────────────────────────────────────

/** Contextual confirmation message — generated from parse signals, not random picks */
export type CaptureConfirmationMessage = string;
