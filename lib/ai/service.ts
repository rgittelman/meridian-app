/**
 * lib/ai/service.ts — Centralized AI service layer.
 *
 * All AI calls in Meridian go through this module.
 * Handles provider selection, fallback, streaming, and safe error logging.
 */

import { AI_CONFIG } from "./config";
import { ollamaProvider } from "./providers/ollama";
import { openaiProvider } from "./providers/openai";
import { claudeProvider } from "./providers/claude";
import type {
  AIProviderInterface,
  AICompletionOptions,
  AICompletionResult,
  AIStreamResult,
  AIEmbeddingOptions,
  AIEmbeddingResult,
  AIProvider,
} from "./types";

const providers: Record<AIProvider, AIProviderInterface> = {
  ollama: ollamaProvider,
  openai: openaiProvider,
  claude: claudeProvider,
};

const FALLBACK_ORDER: AIProvider[] = ["ollama", "openai", "claude"];

/** Resolve the active provider, falling back through the chain. */
async function resolveProvider(preferred?: AIProvider): Promise<AIProviderInterface> {
  const order: AIProvider[] = preferred
    ? [preferred, ...FALLBACK_ORDER.filter((p) => p !== preferred)]
    : [AI_CONFIG.primaryProvider, ...FALLBACK_ORDER.filter((p) => p !== AI_CONFIG.primaryProvider)];

  for (const name of order) {
    const provider = providers[name];
    if (await provider.isAvailable()) return provider;
  }

  throw new Error("[ai] No AI provider available");
}

/** Non-streaming completion with automatic provider fallback. */
export async function aiComplete(
  options: AICompletionOptions,
  preferred?: AIProvider,
): Promise<AICompletionResult> {
  try {
    const provider = await resolveProvider(preferred);
    return await provider.complete(options);
  } catch (err) {
    console.error("[ai] complete error:", err instanceof Error ? err.message : err);
    throw err;
  }
}

/** Streaming completion — returns async iterable of tokens. */
export async function aiStream(
  options: AICompletionOptions,
  preferred?: AIProvider,
): Promise<AIStreamResult> {
  const provider = await resolveProvider(preferred);
  return provider.stream(options);
}

/** Convert AI stream to a Web ReadableStream for API responses. */
export async function aiStreamToResponse(
  options: AICompletionOptions,
  preferred?: AIProvider,
): Promise<{ stream: ReadableStream<Uint8Array>; provider: AIProvider; model: string }> {
  const result = await aiStream(options, preferred);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const token of result.stream) {
          controller.enqueue(encoder.encode(token));
        }
      } catch (err) {
        console.error("[ai] stream error:", err instanceof Error ? err.message : err);
      } finally {
        controller.close();
      }
    },
  });

  return { stream, provider: result.provider, model: result.model };
}

/** Generate embeddings with automatic provider fallback. */
export async function aiEmbed(
  options: AIEmbeddingOptions,
  preferred?: AIProvider,
): Promise<AIEmbeddingResult> {
  try {
    const provider = await resolveProvider(preferred);
    return await provider.embed(options);
  } catch (err) {
    console.error("[ai] embed error:", err instanceof Error ? err.message : err);
    throw err;
  }
}

/** Check whether any AI provider is reachable. */
export async function isAIAvailable(): Promise<boolean> {
  for (const name of FALLBACK_ORDER) {
    if (await providers[name].isAvailable()) return true;
  }
  return false;
}

/** Trim message history to the most recent N turns for performance. */
export function trimMessages<T extends { role: string; content: string }>(
  messages: T[],
  max = AI_CONFIG.maxContextMessages,
): T[] {
  if (messages.length <= max) return messages;
  return messages.slice(-max);
}
