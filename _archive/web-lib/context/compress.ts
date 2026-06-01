/**
 * lib/context/compress.ts — Recent conversation compression.
 *
 * When a conversation exceeds 4 turns, compress older messages
 * into a summary to preserve context without bloating the prompt.
 */

import { aiComplete } from "@/lib/ai/service";
import { buildCompressionPrompt } from "@/lib/ai/prompts";

/** Compress a message history into a short summary string. */
export async function compressConversation(
  messages: { role: "user" | "assistant"; content: string }[],
): Promise<string | null> {
  if (messages.length <= 4) return null;

  // Compress all but the last 2 turns
  const toCompress = messages.slice(0, -2);
  const recent     = messages.slice(-2);

  try {
    const prompt = buildCompressionPrompt(toCompress);
    const result = await aiComplete({
      messages:    [{ role: "user", content: prompt }],
      maxTokens:   150,
      temperature: 0.2,
    });

    const summary = result.content.trim();
    const recentSnippet = recent
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    return `${summary}\n\nMost recent:\n${recentSnippet}`;
  } catch {
    // Fallback: simple truncation
    return toCompress
      .slice(-3)
      .map((m) => `${m.role}: ${m.content.slice(0, 80)}`)
      .join("\n");
  }
}
