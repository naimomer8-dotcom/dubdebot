import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { db } from "@/lib/supabase";
import { gemini, EMBED_MODEL, EMBED_DIM } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

const TYPES = new Set(["book", "booklet", "youtube", "doc", "golden", "social", "podcast"]);

function authorized(req: Request) {
  const expected = process.env.ADMIN_TOKEN;
  const got = req.headers.get("x-admin-token") ?? "";
  if (!expected || expected.length < 24) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Admin-only: embed text chunks with Gemini and store them in the knowledge base.
 * Body: { source, sourceType, title?, url?, startIndex?, replace?, chunks: string[] }
 * Keys never leave the server – the ingestion script only sends plain text.
 */
export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "bad json" }, { status: 400 });

  const source = String(body.source ?? "").slice(0, 200);
  const sourceType = String(body.sourceType ?? "");
  const chunks: string[] = Array.isArray(body.chunks) ? body.chunks.map((c: unknown) => String(c)).filter((c: string) => c.trim().length > 40) : [];
  const startIndex = Number(body.startIndex ?? 0);
  if (!source || !TYPES.has(sourceType) || !chunks.length || chunks.length > 60) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const supabase = db();
  if (body.replace) await supabase.from("knowledge_chunks").delete().eq("source", source);

  let vectors: number[][] = [];
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await gemini().models.embedContent({
        model: EMBED_MODEL,
        contents: chunks,
        config: { outputDimensionality: EMBED_DIM, taskType: "RETRIEVAL_DOCUMENT" },
      });
      vectors = (res.embeddings ?? []).map((e) => e.values ?? []);
      break;
    } catch (e) {
      if (attempt === 3) return NextResponse.json({ error: "embedding failed", detail: String(e).slice(0, 300) }, { status: 502 });
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }

  if (sourceType === "golden") {
    // chunks are "Q\n---\nA" pairs
    const rows = chunks.map((c, i) => {
      const [q, ...a] = c.split("\n---\n");
      return { question: q.trim(), answer: a.join("\n---\n").trim(), embedding: vectors[i] };
    });
    const { error } = await supabase.from("golden_answers").insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, inserted: rows.length });
  }

  const rows = chunks.map((content, i) => ({
    source,
    source_type: sourceType,
    title: body.title ? String(body.title).slice(0, 200) : source,
    url: body.url ? String(body.url).slice(0, 500) : null,
    chunk_index: startIndex + i,
    content,
    embedding: vectors[i],
    meta: Array.isArray(body.meta) && body.meta[i] && typeof body.meta[i] === "object" ? body.meta[i] : null,
  }));
  const { error } = await supabase.from("knowledge_chunks").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, inserted: rows.length });
}
