/**
 * lib/ai/types.ts — AI provider abstraction types.
 */

export type AIProvider = "ollama" | "openai" | "claude";

export type AIMessageRole = "system" | "user" | "assistant";

export interface AIMessage {
  role:    AIMessageRole;
  content: string;
}

export interface AICompletionOptions {
  messages:     AIMessage[];
  model?:       string;
  temperature?: number;
  maxTokens?:   number;
}

export interface AICompletionResult {
  content:  string;
  model:    string;
  provider: AIProvider;
}

export interface AIStreamResult {
  model:    string;
  provider: AIProvider;
  /** Async iterable of text tokens */
  stream:   AsyncIterable<string>;
}

export interface AIEmbeddingOptions {
  input:  string | string[];
  model?: string;
}

export interface AIEmbeddingResult {
  embeddings: number[][];
  model:      string;
  provider:   AIProvider;
  dimensions: number;
}

export interface AIProviderInterface {
  name:     AIProvider;
  complete(options: AICompletionOptions): Promise<AICompletionResult>;
  stream(options: AICompletionOptions): Promise<AIStreamResult>;
  embed(options: AIEmbeddingOptions): Promise<AIEmbeddingResult>;
  isAvailable(): Promise<boolean>;
}
