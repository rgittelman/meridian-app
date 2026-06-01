import { nanoid } from 'nanoid/non-secure';

import type { CaptureConfirmationMessage, LifeObject } from '@/types/capture';
import { parseCapture } from '@/utils/parsing';
import { deriveTitle } from '@/utils/parsing/deriveTitle';
import { deriveObjectType } from '@/utils/parsing/deriveObjectType';
import { deriveMomentum } from '@/utils/parsing/deriveMomentum';
import { aiCaptureParser } from '@/services/ai/aiCaptureParser';
import { generateCalendarLinkConfirmation } from '@/services/capture/calendarConfirmation';
import { planPromotionConfirmationMessage } from '@/services/plan/planPromotionConfirmation';

/**
 * Creates a LifeObject from raw input text.
 *
 * Step 1: Local parse (synchronous — never blocks UI)
 * Step 2: Derive title, objectType, momentumValue from parse
 * Step 3: Return object immediately with 'captured' status
 * Step 4 (async, background): AI enrichment updates parse fields
 *
 * The caller receives the LifeObject before AI enrichment completes.
 */
export function createLifeObject(raw: string): LifeObject {
  const text = raw.trim();
  const parse = parseCapture(text);
  const recurrence =
    parse.recurrence?.confidence !== 'low' ? parse.recurrence?.value ?? null : null;

  return {
    id: nanoid(10),
    raw: text,
    title: deriveTitle(text),
    objectType: deriveObjectType(parse),
    createdAt: new Date(),
    status: recurrence ? 'active' : 'captured',
    parse,
    momentumValue: deriveMomentum(parse),
    recurrence,
  };
}

/**
 * Generates a contextually aware confirmation message from a LifeObject.
 *
 * The message reflects what Meridian actually understood — quietly competent,
 * never technical, never generic when it can be specific.
 *
 * Priority:
 * 1. Related context (prep chain, cluster) — most specific
 * 2. Person + timing together
 * 3. Person alone
 * 4. Timing alone
 * 5. Category signal
 * 6. Routine detection
 * 7. Generic calm fallback
 */
export function generateConfirmation(item: LifeObject): CaptureConfirmationMessage {
  const calendarMessage = generateCalendarLinkConfirmation(item);
  if (calendarMessage) return calendarMessage;

  const planMessage = planPromotionConfirmationMessage(item);
  if (planMessage) return planMessage;

  const { parse } = item;

  const topPerson = parse.people.find((p) => p.confidence !== 'low');
  const timing = parse.timing;
  const topContext = parse.relatedContexts.find((r) => r.confidence !== 'low')
    ?? parse.relatedContexts[0];

  // Relationship context — most specific signal
  if (topContext && topContext.confidence === 'high') {
    return `This looks connected to your ${topContext.label}.`;
  }

  // Person + timing — rich interpersonal signal
  if (topPerson && timing && timing.confidence !== 'low') {
    const when = timing.value.label;
    return `Meridian connected this to ${topPerson.value} — ${when}.`;
  }

  // Person alone
  if (topPerson && topPerson.confidence === 'high') {
    return `Meridian connected this to ${topPerson.value}.`;
  }

  // Timing alone — high or medium confidence
  if (timing && timing.confidence === 'high') {
    return `Added for ${timing.value.label}.`;
  }

  // Medium-confidence relationship context
  if (topContext) {
    return `This looks connected to your ${topContext.label}.`;
  }

  // Category signal — calm category-aware message
  const cat = parse.category;
  if (cat && cat.confidence !== 'low') {
    const categoryMessages: Partial<Record<string, string>> = {
      financial: "We'll remind you before it's due.",
      family: 'Filed with family things.',
      work: 'Added to your work context.',
      health: 'Health note captured.',
      household: 'Home task captured.',
      personal: 'Personal note captured.',
    };
    const msg = categoryMessages[cat.value];
    if (msg) return msg;
  }

  // Recurring commitment
  if (item.recurrence) {
    return `Set as ${item.recurrence.label.toLowerCase()} — Meridian will bring it back when it's due.`;
  }

  // Routine pattern
  if (parse.isRoutine) {
    return 'Noted as a recurring thing.';
  }

  // Timing at lower confidence
  if (timing) {
    return `Added for ${timing.value.label}.`;
  }

  // Generic fallback — always calm, always relieving
  const fallbacks: CaptureConfirmationMessage[] = [
    'Captured. You can forget about it for now.',
    "Got it. We'll hold onto this.",
    "You're covered.",
    'Noted.',
    "You don't need to organize this right now.",
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

/**
 * Background AI enrichment — fire-and-forget with a callback.
 * Safe to ignore in v1 while StubAICaptureParser is active.
 */
export async function enrichInBackground(
  item: LifeObject,
  onEnriched: (updatedItem: LifeObject) => void,
): Promise<void> {
  try {
    const enriched = await aiCaptureParser.enrich(item.raw, item.parse);
    if (enriched !== item.parse) {
      onEnriched({ ...item, parse: enriched });
    }
  } catch {
    // Enrichment failure is silent — item already exists in store
  }
}
