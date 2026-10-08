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

/** Fast, cheap model for voice and everyday chat (measured ~0.6s to first token vs ~2.5s). */
export const FAST_MODEL = process.env.GEMINI_FAST_MODEL || "gemini-3.1-flash-lite";
export const LITE_THINKING = { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } };

/**
 * Model routing: heavy deliverables (plans, forecasts, scripts, files, long questions) go to the strong model;
 * voice turns and everyday chat go to the fast model. Set ROUTING=strong to disable.
 */
export function pickModel(opts:{voice:boolean;mode:string;hasAttachments:boolean;textLength:number}) {
  if (process.env.ROUTING === "strong") return { model: CHAT_MODEL, thinking: FAST_THINKING, tier: "strong" as const };
  // Regular chat + voice always run on Flash-Lite (fast and cheap).
  // Only document analysis and the heavy number tools use the strong model.
  const heavy = !opts.voice && (opts.hasAttachments || opts.mode === "forecast" || opts.mode === "workplan");
  return heavy ? { model: CHAT_MODEL, thinking: FAST_THINKING, tier: "strong" as const } : { model: FAST_MODEL, thinking: LITE_THINKING, tier: "fast" as const };
}
