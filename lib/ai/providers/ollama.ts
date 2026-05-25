/**
 * lib/ai/providers/ollama.ts — Ollama provider implementation.
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

export class OllamaProvider implements AIProviderInterface {
  name = "ollama" as const;
  private baseUrl = AI_CONFIG.ollama.baseUrl;

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(2000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async complete(options: AICompletionOptions): Promise<AICompletionResult> {
    const model = options.model ?? AI_CONFIG.ollama.chatModel;

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: options.messages,
        stream:   false,
        options: {
          temperature: options.temperature ?? 0.3,
          num_predict: options.maxTokens ?? 512,
        },
      }),
      signal: AbortSignal.timeout(AI_CONFIG.timeoutMs),
    });

    if (!res.ok) {
      throw new Error(`Ollama completion failed: ${res.status}`);
    }

    const json = await res.json();
    return {
      content:  json.message?.content ?? "",
      model,
      provider: "ollama",
    };
  }

  async stream(options: AICompletionOptions): Promise<AIStreamResult> {
    const model = options.model ?? AI_CONFIG.ollama.chatModel;

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: options.messages,
        stream:   true,
        options: {
          temperature: options.temperature ?? 0.3,
          num_predict: options.maxTokens ?? 512,
        },
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok || !res.body) {
      throw new Error(`Ollama stream failed: ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    async function* tokenStream(): AsyncIterable<string> {
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const json = JSON.parse(line);
            const token = json.message?.content;
            if (token) yield token;
          } catch {
            // skip malformed
          }
        }
      }
    }

    return { model, provider: "ollama", stream: tokenStream() };
  }

  async embed(options: AIEmbeddingOptions): Promise<AIEmbeddingResult> {
    const model  = options.model ?? AI_CONFIG.ollama.embedModel;
    const inputs = Array.isArray(options.input) ? options.input : [options.input];
    const embeddings: number[][] = [];

    for (const text of inputs) {
      const res = await fetch(`${this.baseUrl}/api/embeddings`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt: text }),
        signal: AbortSignal.timeout(AI_CONFIG.timeoutMs),
      });

      if (!res.ok) {
        throw new Error(`Ollama embedding failed: ${res.status}`);
      }

      const json = await res.json();
      embeddings.push(json.embedding ?? []);
    }

    return {
      embeddings,
      model,
      provider:   "ollama",
      dimensions: embeddings[0]?.length ?? 768,
    };
  }
}

export const ollamaProvider = new OllamaProvider();
