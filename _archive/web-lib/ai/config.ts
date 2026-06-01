/**
 * lib/ai/config.ts — Centralized AI configuration.
 *
 * Only NEXT_PUBLIC_* vars are safe for client-side reads.
 * All provider keys and URLs are server-only.
 */

import type { AIProvider } from "./types";

export const AI_CONFIG = {
  /** Primary provider for completions. Falls back if unavailable. */
  primaryProvider: (process.env.AI_PROVIDER ?? "ollama") as AIProvider,

  ollama: {
    baseUrl: process.env.OLLAMA_URL ?? "http://localhost:11434",
    chatModel: process.env.OLLAMA_CHAT_MODEL ?? "llama3.2:3b",
    embedModel: process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text",
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? "",
    chatModel: process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini",
    embedModel: process.env.OPENAI_EMBED_MODEL ?? "text-embedding-3-small",
  },

  claude: {
    apiKey: process.env.ANTHROPIC_API_KEY ?? "",
    chatModel: process.env.CLAUDE_CHAT_MODEL ?? "claude-sonnet-4-20250514",
  },

  /** Max messages sent to the model per request (performance). */
  maxContextMessages: 30,

  /** Timeout for non-streaming AI calls (ms). */
  timeoutMs: Number(process.env.AI_TIMEOUT_MS ?? 15000),

  /** Max tokens for memory extraction prompts. */
  memoryExtractMaxTokens: 600,

  /** Max memories to inject into a chat system prompt. */
  maxMemoriesInPrompt: 8,
} as const;
