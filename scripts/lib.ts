import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001";

export function chunkText(text: string, size = 1200, overlap = 200): string[] {
  const clean = text.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  const paras = clean.split(/\n\n+/);
  const chunks: string[] = [];
  let cur = "";
  for (const p of paras) {
    if ((cur + "\n\n" + p).length > size && cur) {
      chunks.push(cur.trim());
      cur = cur.slice(-overlap) + "\n\n" + p;
    } else {
      cur = cur ? cur + "\n\n" + p : p;
    }
    while (cur.length > size * 1.6) {
      chunks.push(cur.slice(0, size).trim());
      cur = cur.slice(size - overlap);
    }
  }
  if (cur.trim().length > 80) chunks.push(cur.trim());
  return chunks;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function embedBatch(texts: string[]): Promise<number[][]> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await ai.models.embedContent({
        model: EMBED_MODEL,
        contents: texts,
        config: { outputDimensionality: 768, taskType: "RETRIEVAL_DOCUMENT" },
      });
      return (res.embeddings ?? []).map((e) => e.values ?? []);
    } catch (e) {
      const wait = 2000 * (attempt + 1);
      console.warn(`  embed retry in ${wait}ms`, (e as Error).message);
      await sleep(wait);
    }
  }
  throw new Error("embedding failed after retries");
}

export async function upsertSource(opts: {
  source: string;
  sourceType: "book" | "booklet" | "youtube" | "doc";
  title?: string;
  url?: string;
  text: string;
}) {
  const chunks = chunkText(opts.text);
  if (!chunks.length) return 0;
  await supabase.from("knowledge_chunks").delete().eq("source", opts.source);
  for (let i = 0; i < chunks.length; i += 40) {
    const batch = chunks.slice(i, i + 40);
    const vectors = await embedBatch(batch);
    const rows = batch.map((content, j) => ({
      source: opts.source,
      source_type: opts.sourceType,
      title: opts.title ?? opts.source,
      url: opts.url ?? null,
      chunk_index: i + j,
      content,
      embedding: vectors[j],
    }));
    const { error } = await supabase.from("knowledge_chunks").insert(rows);
    if (error) throw error;
    await sleep(300);
  }
  return chunks.length;
}
