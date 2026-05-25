/**
 * lib/ai/providers/openai.ts — OpenAI provider implementation.
 *
 * Server-only. OPENAI_API_KEY must never be prefixed with NEXT_PUBLIC_.
 */

import OpenAI from "openai";
import { AI_CONFIG } from "../config";
import type {
  AIProviderInterface,
  AICompletionOptions,
  AICompletionResult,
  AIStreamResult,
  AIEmbeddingOptions,
  AIEmbeddingResult,
} from "../types";

export class OpenAIProvider implements AIProviderInterface {
  name = "openai" as const;
  private client: OpenAI | null = null;

  private getClient(): OpenAI {
    if (!this.client) {
      const key = AI_CONFIG.openai.apiKey;
      if (!key) throw new Error("OPENAI_API_KEY is not configured");
      this.client = new OpenAI({ apiKey: key });
    }
    return this.client;
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(AI_CONFIG.openai.apiKey);
  }

  async complete(options: AICompletionOptions): Promise<AICompletionResult> {
    const model = options.model ?? AI_CONFIG.openai.chatModel;

    const res = await this.getClient().chat.completions.create({
      model,
      messages: options.messages.map((m) => ({
        role:    m.role,
        content: m.content,
      })),
      temperature: options.temperature ?? 0.3,
      max_tokens:  options.maxTokens ?? 512,
    });

    return {
      content:  res.choices[0]?.message?.content ?? "",
      model,
      provider: "openai",
    };
  }

  async stream(options: AICompletionOptions): Promise<AIStreamResult> {
    const model = options.model ?? AI_CONFIG.openai.chatModel;

    const res = await this.getClient().chat.completions.create({
      model,
      messages: options.messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options.temperature ?? 0.3,
      max_tokens:  options.maxTokens ?? 512,
      stream:      true,
    });

    async function* tokenStream(): AsyncIterable<string> {
      for await (const chunk of res) {
        const token = chunk.choices[0]?.delta?.content;
        if (token) yield token;
      }
    }

    return { model, provider: "openai", stream: tokenStream() };
  }

  async embed(options: AIEmbeddingOptions): Promise<AIEmbeddingResult> {
    const model  = options.model ?? AI_CONFIG.openai.embedModel;
    const inputs = Array.isArray(options.input) ? options.input : [options.input];

    const res = await this.getClient().embeddings.create({ model, input: inputs });

    const embeddings = res.data
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding);

    return {
      embeddings,
      model,
      provider:   "openai",
      dimensions: embeddings[0]?.length ?? 1536,
    };
  }
}

export const openaiProvider = new OpenAIProvider();
