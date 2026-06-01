/**
 * Meridian Capture — domain types.
 *
 * Everything the user throws at Meridian becomes a LifeObject.
 * Users do NOT manually classify. Meridian absorbs the organizational burden.
 */
import type { EmotionalWeight, ItemCategory, UrgencyLevel } from '@/services/priority/types';

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

export type CaptureParseResult = {
  raw: string;
  /** Named people detected */
  people: ParsedField<string>[];
  /** Timing / due signal, if present */
  timing: ParsedField<TimingHint> | null;
  /** Inferred item category */
  category: ParsedField<ItemCategory> | null;
  /** Urgency signal derived from language */
  urgency: ParsedField<UrgencyLevel> | null;
  /** Emotional weight inferred from phrasing */
  emotionalWeight: ParsedField<EmotionalWeight> | null;
  /** True if the text implies a scheduling action */
  schedulingIntent: boolean;
  /** True if the text suggests a recurring pattern */
  isRoutine: boolean;
};

// ── Life Object — unified capture output ──────────────────────────────────────

export type LifeObjectStatus =
  | 'captured'   // just entered — not yet clarified
  | 'clarifying' // AI/system processing
  | 'active'     // in circulation (on Focus, Plan, etc.)
  | 'done'
  | 'archived';

/**
 * The central unit of everything in Meridian.
 * Tasks, reminders, events, goals — all LifeObjects.
 */
export type LifeObject = {
  id: string;
  raw: string;
  createdAt: Date;
  status: LifeObjectStatus;
  parse: CaptureParseResult;
};

// ── Capture store state surface ───────────────────────────────────────────────

export type CaptureConfirmationMessage =
  | 'Captured.'
  | 'Got it.'
  | "We'll keep track of it."
  | 'Noted.'
  | "You're covered.";

export const CAPTURE_CONFIRMATIONS: CaptureConfirmationMessage[] = [
  'Captured.',
  'Got it.',
  "We'll keep track of it.",
  'Noted.',
  "You're covered.",
];
