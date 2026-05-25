/**
 * lib/ai/providers/claude.ts — Anthropic Claude provider (stub).
 *
 * Future: wire ANTHROPIC_API_KEY and @anthropic-ai/sdk.
 * Server-only — key must never use NEXT_PUBLIC_ prefix.
 */

import { AI_CONFIG } from "../config";
import type {
  AIProviderInterface,
  AICompletionOptions,
  AICompletionResult,
  AIStreamResult,
  AIEmbeddingOptions,
  AIEmbeddingResult,
} from "../types";

export class ClaudeProvider implements AIProviderInterface {
  name = "claude" as const;

  async isAvailable(): Promise<boolean> {
    return Boolean(AI_CONFIG.claude.apiKey);
  }

  private unavailable(): never {
    throw new Error(
      "Claude provider not yet configured. Set ANTHROPIC_API_KEY to enable.",
    );
  }

  async complete(_options: AICompletionOptions): Promise<AICompletionResult> {
    this.unavailable();
  }

  async stream(_options: AICompletionOptions): Promise<AIStreamResult> {
    this.unavailable();
  }

  async embed(_options: AIEmbeddingOptions): Promise<AIEmbeddingResult> {
    this.unavailable();
  }
}

export const claudeProvider = new ClaudeProvider();
