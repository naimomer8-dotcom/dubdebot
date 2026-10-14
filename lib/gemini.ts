import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { BudgetExceeded, overBudget, recordSpend, type Usage } from "./budget";

let ai: GoogleGenAI | null = null;

/**
 * The Gemini client, metered: every call first checks the monthly ₪ budget (lib/budget.ts) and
 * adds its token cost afterwards. Over budget → throws BudgetExceeded, so callers fail soft.
 */
export function gemini() {
  if (ai) return ai;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
  const client = new GoogleGenAI({ apiKey });
  const m = client.models;
  type GenArgs = Parameters<typeof m.generateContent>[0];
  type EmbArgs = Parameters<typeof m.embedContent>[0];
  const gen = m.generateContent.bind(m);
  const genStream = m.generateContentStream.bind(m);
  const emb = m.embedContent.bind(m);
  const guard = async () => { if (await overBudget()) throw new BudgetExceeded(); };

  m.generateContent = (async (args: GenArgs) => {
    await guard();
    const res = await gen(args);
    await recordSpend(String(args.model), res.usageMetadata as Usage);
    return res;
  }) as typeof m.generateContent;

  m.generateContentStream = (async (args: GenArgs) => {
    await guard();
    const stream = await genStream(args);
    let usage: Usage = null;
    async function* metered() {
      try {
        for await (const chunk of stream) {
          if (chunk.usageMetadata) usage = chunk.usageMetadata as Usage;
          yield chunk;
        }
      } finally {
        await recordSpend(String(args.model), usage);
      }
    }
    return metered();
  }) as typeof m.generateContentStream;

  m.embedContent = (async (args: EmbArgs) => {
    await guard();
    const res = await emb(args);
    const chars = JSON.stringify(args.contents ?? "").length;
    await recordSpend(String(args.model), null, chars);
    return res;
  }) as typeof m.embedContent;

  ai = client;
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
export function pickModel(_opts: { voice: boolean; mode: string; hasAttachments: boolean; textLength?: number }) {
  // Cost first: everything runs on Flash-Lite (≈3x cheaper). Set ROUTING=strong in Vercel to bring back the strong model.
  if (process.env.ROUTING === "strong") return { model: CHAT_MODEL, thinking: FAST_THINKING, tier: "strong" as const };
  return { model: FAST_MODEL, thinking: LITE_THINKING, tier: "fast" as const };
}
