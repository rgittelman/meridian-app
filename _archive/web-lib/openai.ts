import OpenAI from "openai";

// Stub: client instantiated but not called until AI features are wired
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? "",
});
