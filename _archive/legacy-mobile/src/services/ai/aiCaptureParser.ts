import type { CaptureParseResult } from '@/types/capture';

/**
 * AICaptureParser interface.
 *
 * AI enrichment sits AFTER local parsing — it overlays or improves confidence
 * on existing fields rather than replacing them wholesale.
 *
 * Design rules:
 * - Never block the capture submission. AI runs async after item is stored.
 * - Never downgrade high-confidence local results.
 * - Stay humble: if uncertain, leave fields null rather than guess.
 * - Failure must be silent. The LifeObject already exists before enrichment runs.
 */
export interface AICaptureParser {
  /**
   * Enrich a locally-parsed result with AI inference.
   * May improve confidence levels, fill missing fields, or add context.
   */
  enrich(raw: string, parsed: CaptureParseResult): Promise<CaptureParseResult>;
}

/**
 * Stub implementation — returns local parse unchanged.
 * Replace with real AI service (OpenAI / Claude) when backend is wired.
 */
export class StubAICaptureParser implements AICaptureParser {
  async enrich(_raw: string, parsed: CaptureParseResult): Promise<CaptureParseResult> {
    // Future: call `app/api/capture/enrich` on the Next.js backend
    return parsed;
  }
}

/** Active implementation — swap this to enable AI enrichment */
export const aiCaptureParser: AICaptureParser = new StubAICaptureParser();
