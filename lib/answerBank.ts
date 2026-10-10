import { gemini, EMBED_MODEL, EMBED_DIM } from "./gemini";
import { db } from "./supabase";

/**
 * Answer bank: approved answers to common, generic questions are served without calling the model.
 * Only the question embedding is computed (≈ a thousandth of an agora), and that same embedding is
 * reused for the knowledge search when the answer isn't in the bank.
 */
export const BANK_MIN_SIMILARITY = Number(process.env.BANK_MIN_SIMILARITY || 0.92);
const MINE_CLUSTER = 0.88;

const FOLLOW_UP = /^(ו|אז |ומה|ואם|וגם|ואיך|ולמה|ומתי|אבל|תמשיך|עוד|כן|לא|אוקיי|סבבה|תסביר|תפרט|מה עם|זה |זאת )/;

/** A question that could be answered the same way for everyone: no numbers, not a follow-up, normal length. */
export function isGenericQuestion(text: string, firstMessage: boolean) {
  const t = text.trim();
  if (t.length < 15 || t.length > 220) return false;
  if (/\d/.test(t)) return false; // numbers = his specific business
  if (/https?:\/\/|www\./i.test(t)) return false;
  if (!firstMessage && FOLLOW_UP.test(t)) return false;
  return true;
}

export async function embedMany(texts: string[]): Promise<number[][]> {
  if (!texts.length) return [];
  const res = await gemini().models.embedContent({
    model: EMBED_MODEL,
    contents: texts,
    config: { outputDimensionality: EMBED_DIM, taskType: "RETRIEVAL_QUERY" },
  });
  const out = (res.embeddings ?? []).map((e) => e.values ?? []);
  if (out.length !== texts.length) throw new Error("embedding count mismatch");
  return out;
}

export async function lookupBank(embedding: number[]): Promise<{ id: number; answer: string; similarity: number } | null> {
  const { data, error } = await db().rpc("match_answer_bank", { query_embedding: embedding, min_similarity: BANK_MIN_SIMILARITY, only_approved: true });
  if (error) {
    console.error("bank lookup failed", error.message);
    return null;
  }
  const row = (data ?? [])[0] as { id: number; answer: string; similarity: number } | undefined;
  return row ?? null;
}

/** Fill the {name} placeholder with the user's first name. */
export function personalize(answer: string, fullName: string | null) {
  const first = (fullName ?? "").trim().split(/\s+/)[0] || "";
  return answer.replace(/\{name\}/g, first).replace(/\s+([,.!?])/g, "$1").replace(/^\s*,\s*/, "");
}

const cos = (a: number[], b: number[]) => {
  let d = 0, x = 0, y = 0;
  for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; x += a[i] * a[i]; y += b[i] * b[i]; }
  return d / (Math.sqrt(x) * Math.sqrt(y) || 1);
};

/**
 * Mines recent conversations for repeated generic questions and adds them to the bank as "pending"
 * (with the answer the bot gave) for an admin to approve, edit or reject.
 */
export async function mineQuestions(): Promise<{ scanned: number; added: number; merged: number }> {
  const supabase = db();
  const { data: mark } = await supabase.from("app_settings").select("value").eq("key", "bank_mined_until").maybeSingle();
  const since = (mark?.value as { at?: string } | undefined)?.at ?? "1970-01-01T00:00:00Z";
  const startedAt = new Date().toISOString();

  const { data: users } = await supabase
    .from("messages")
    .select("id, conversation_id, content, created_at")
    .eq("role", "user")
    .gt("created_at", since)
    .order("created_at", { ascending: true })
    .limit(600);
  const qs = ((users ?? []) as { id: string; conversation_id: string; content: string; created_at: string }[]).filter((m) => isGenericQuestion(m.content, true));
  if (!qs.length) {
    await supabase.from("app_settings").upsert({ key: "bank_mined_until", value: { at: startedAt }, updated_at: startedAt });
    return { scanned: 0, added: 0, merged: 0 };
  }

  // the assistant reply that followed each question
  const convIds = [...new Set(qs.map((q) => q.conversation_id))];
  const { data: replies } = await supabase
    .from("messages")
    .select("conversation_id, content, created_at, model")
    .eq("role", "assistant")
    .in("conversation_id", convIds)
    .gt("created_at", since)
    .order("created_at", { ascending: true });
  const byConv = new Map<string, { content: string; created_at: string; model: string | null }[]>();
  for (const r of (replies ?? []) as { conversation_id: string; content: string; created_at: string; model: string | null }[]) {
    const a = byConv.get(r.conversation_id) ?? [];
    a.push(r);
    byConv.set(r.conversation_id, a);
  }
  // only free-chat conversations (tool modes like work plans are personal by nature)
  const { data: convs } = await supabase.from("conversations").select("id, mode").in("id", convIds);
  const chatConv = new Set(((convs ?? []) as { id: string; mode: string }[]).filter((c) => !c.mode || c.mode === "chat").map((c) => c.id));
  const pairs = qs
    .filter((q) => chatConv.has(q.conversation_id))
    .map((q) => {
      const ans = (byConv.get(q.conversation_id) ?? []).find((r) => r.created_at > q.created_at);
      return ans && ans.model !== "canned" && ans.model !== "bank" && ans.content.length > 40 ? { q, answer: ans.content } : null;
    })
    .filter(Boolean) as { q: (typeof qs)[number]; answer: string }[];

  let added = 0, merged = 0;
  for (let i = 0; i < pairs.length; i += 50) {
    const chunk = pairs.slice(i, i + 50);
    const embs = await embedMany(chunk.map((p) => p.q.content));
    const fresh: { emb: number[]; row: { question: string; answer: string; asked: number; source_message_id: string } }[] = [];
    for (let k = 0; k < chunk.length; k++) {
      const emb = embs[k];
      // already in the bank (any status)? count it as asked again
      const { data: hit } = await supabase.rpc("match_answer_bank", { query_embedding: emb, min_similarity: MINE_CLUSTER, only_approved: false });
      const existing = (hit ?? [])[0] as { id: number } | undefined;
      if (existing) {
        const { data: cur } = await supabase.from("answer_bank").select("asked").eq("id", existing.id).single();
        await supabase.from("answer_bank").update({ asked: (cur?.asked ?? 1) + 1, updated_at: new Date().toISOString() }).eq("id", existing.id);
        merged++;
        continue;
      }
      // similar to another new question in this run?
      const twin = fresh.find((f) => cos(f.emb, emb) >= MINE_CLUSTER);
      if (twin) {
        twin.row.asked++;
        merged++;
        continue;
      }
      fresh.push({ emb, row: { question: chunk[k].q.content.trim(), answer: chunk[k].answer, asked: 1, source_message_id: chunk[k].q.id } });
    }
    if (fresh.length) {
      const { error } = await supabase.from("answer_bank").insert(fresh.map((f) => ({ ...f.row, embedding: f.emb, status: "pending" })));
      if (error) throw new Error(error.message);
      added += fresh.length;
    }
  }
  await supabase.from("app_settings").upsert({ key: "bank_mined_until", value: { at: startedAt }, updated_at: startedAt });
  return { scanned: qs.length, added, merged };
}
