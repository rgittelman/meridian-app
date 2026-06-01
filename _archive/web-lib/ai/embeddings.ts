/**
 * lib/ai/embeddings.ts — Embedding utilities.
 *
 * Generates embeddings and computes cosine similarity for memory retrieval.
 */

import { aiEmbed } from "./service";

/** Generate a single embedding vector for the given text. */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const result = await aiEmbed({ input: text });
    return result.embeddings[0] ?? null;
  } catch {
    return null;
  }
}

/** Cosine similarity between two equal-length vectors. Returns 0–1. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/** Batch cosine similarity: score query against many candidate vectors. */
export function batchCosineSimilarity(
  query: number[],
  candidates: number[][],
): number[] {
  return candidates.map((c) => cosineSimilarity(query, c));
}

/** Fallback text similarity when embeddings are unavailable (Jaccard on word sets). */
export function textSimilarity(a: string, b: string): number {
  const setA = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
  const setB = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
