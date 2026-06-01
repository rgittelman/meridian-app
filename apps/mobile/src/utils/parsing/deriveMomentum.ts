import type { CaptureParseResult } from '@/types/capture';

/**
 * Derives a momentum value (0–1) representing the mental-relief impact
 * of completing this item.
 *
 * Higher momentum = more cognitive load released when done.
 * This prioritizes mental relief over raw urgency.
 *
 * Design principles:
 * - Family logistics score high (interpersonal, emotionally loaded)
 * - Financial items score high (anxiety-producing when pending)
 * - Timing + people together amplifies significantly
 * - Pure admin tasks score lower (low emotional stake)
 * - Uncertainty stays at mid-baseline rather than inflating
 */
export function deriveMomentum(parse: CaptureParseResult): number {
  let score = 0.35; // baseline — every captured thought has value

  // ── Timing sensitivity ────────────────────────────────────────────────────
  if (parse.timing) {
    if (parse.timing.confidence === 'high') score += 0.20;
    else if (parse.timing.confidence === 'medium') score += 0.08;
    else score += 0.03;
  }

  // ── People involvement — interpersonal = higher stakes ────────────────────
  const highConfPeople = parse.people.filter((p) => p.confidence === 'high');
  const anyPeople = parse.people.length > 0;

  if (highConfPeople.length > 0) {
    score += 0.15;
    if (parse.timing?.confidence === 'high') {
      score += 0.10; // timing + named person amplifier
    }
  } else if (anyPeople) {
    score += 0.07;
  }

  // ── Emotional weight ──────────────────────────────────────────────────────
  const ew = parse.emotionalWeight?.value;
  if (ew === 'HIGH') score += 0.15;
  else if (ew === 'MEDIUM') score += 0.06;

  // ── Category weights — based on typical anxiety load ─────────────────────
  const cat = parse.category?.value;
  if (cat === 'financial') score += 0.12; // money = anxiety amplifier
  else if (cat === 'family') score += 0.10; // child logistics = high stakes
  else if (cat === 'health') score += 0.08;
  else if (cat === 'work') score += 0.05;

  // ── Urgency ───────────────────────────────────────────────────────────────
  const urgency = parse.urgency?.value;
  if (urgency === 'HIGH') score += 0.10;
  else if (urgency === 'MEDIUM') score += 0.04;

  // ── Relationship context — prep chains elevate importance ─────────────────
  if (parse.relatedContexts.length > 0) {
    const highConfContext = parse.relatedContexts.some((r) => r.confidence === 'high');
    score += highConfContext ? 0.08 : 0.04;
  }

  // ── Recurring commitments — steady mental load until handled ──────────────
  if (parse.recurrence?.confidence !== 'low') {
    score += 0.12;
  } else if (parse.isRoutine) {
    score += 0.06;
  }

  return Math.min(1, Math.max(0, score));
}
