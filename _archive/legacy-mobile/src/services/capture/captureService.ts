import { nanoid } from 'nanoid/non-secure';

import type { LifeObject } from '@/types/capture';
import { parseCapture } from '@/utils/parsing';
import { aiCaptureParser } from '@/services/ai/aiCaptureParser';

/**
 * Creates a LifeObject from raw input text.
 *
 * Step 1: Local parse (synchronous — never blocks UI)
 * Step 2: Return object immediately with 'captured' status
 * Step 3 (async, background): AI enrichment updates parse fields
 *
 * The caller receives the LifeObject before AI enrichment completes.
 * Store updates from enrichment should be dispatched via a separate action.
 */
export function createLifeObject(raw: string): LifeObject {
  const parsed = parseCapture(raw);

  return {
    id: nanoid(10),
    raw: raw.trim(),
    createdAt: new Date(),
    status: 'captured',
    parse: parsed,
  };
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
