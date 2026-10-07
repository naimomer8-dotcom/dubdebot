import { GoogleGenAI, ThinkingLevel } from "@google/genai";

let ai: GoogleGenAI | null = null;
export function gemini() {
  if (ai) return ai;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
  ai = new GoogleGenAI({ apiKey });
  return ai;
}

export const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || "gemini-3.8-flash";
export const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001";
export const EMBED_DIM = 768;

export async function embed(text: string, taskType: "RETRIEVAL_QUERY" | "RETRIEVAL_DOCUMENT" = "RETRIEVAL_QUERY") {
  const res = await gemini().models.embedContent({
    model: EMBED_MODEL,
    contents: text,
    config: { outputDimensionality: EMBED_DIM, taskType },
  });
  const values = res.embeddings?.[0]?.values;
  if (!values) throw new Error("Embedding failed");
  return values;
}

/** Gemini 3.x: no temperature/top_p; use thinking level instead. LOW keeps chat fast. */
export const FAST_THINKING = { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } };
