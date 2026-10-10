import { getAdmin, json } from "@/lib/adminAuth";
import { db } from "@/lib/supabase";
import { embedMany, mineQuestions } from "@/lib/answerBank";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Answer bank management: list, mine new questions, add, approve / edit / reject, delete. */
export async function GET() {
  const admin = await getAdmin();
  if (!admin) return json({ error: "unauthorized" }, 401);
  const { data, error } = await db()
    .from("answer_bank")
    .select("id, question, answer, status, asked, hits, created_at, reviewed_by, reviewed_at")
    .order("asked", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return json({ error: error.message }, 500);
  return json({ items: data ?? [] });
}

export async function POST(req: Request) {
  const admin = await getAdmin();
  if (!admin) return json({ error: "unauthorized" }, 401);
  const body = await req.json().catch(() => ({}));
  const supabase = db();
  if (body.action === "mine") {
    try {
      const r = await mineQuestions();
      await supabase.from("admin_audit").insert({ admin_id: admin.id, action: "bank_mine", meta: r });
      return json(r);
    } catch (e) {
      return json({ error: (e as Error).message }, 500);
    }
  }
  if (body.action === "add") {
    const question = String(body.question ?? "").trim().slice(0, 300);
    const answer = String(body.answer ?? "").trim().slice(0, 4000);
    if (question.length < 5 || answer.length < 10) return json({ error: "צריך שאלה ותשובה." }, 400);
    const [emb] = await embedMany([question]);
    const { error } = await supabase.from("answer_bank").insert({ question, answer, embedding: emb, status: "approved", reviewed_by: admin.displayName, reviewed_at: new Date().toISOString() });
    if (error) return json({ error: error.message }, 500);
    await supabase.from("admin_audit").insert({ admin_id: admin.id, action: "bank_add", meta: { question } });
    return json({ ok: true });
  }
  return json({ error: "bad action" }, 400);
}

export async function PATCH(req: Request) {
  const admin = await getAdmin();
  if (!admin) return json({ error: "unauthorized" }, 401);
  const body = await req.json().catch(() => ({}));
  const id = Number(body.id);
  if (!Number.isFinite(id)) return json({ error: "bad id" }, 400);
  const supabase = db();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.answer === "string") patch.answer = body.answer.trim().slice(0, 4000);
  if (typeof body.question === "string") {
    patch.question = body.question.trim().slice(0, 300);
    const [emb] = await embedMany([patch.question as string]);
    patch.embedding = emb;
  }
  if (["approved", "rejected", "pending"].includes(body.status)) {
    patch.status = body.status;
    patch.reviewed_by = admin.displayName;
    patch.reviewed_at = new Date().toISOString();
  }
  const { error } = await supabase.from("answer_bank").update(patch).eq("id", id);
  if (error) return json({ error: error.message }, 500);
  await supabase.from("admin_audit").insert({ admin_id: admin.id, action: "bank_update", meta: { id, status: body.status ?? null, edited: typeof body.answer === "string" } });
  return json({ ok: true });
}

export async function DELETE(req: Request) {
  const admin = await getAdmin();
  if (!admin) return json({ error: "unauthorized" }, 401);
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isFinite(id)) return json({ error: "bad id" }, 400);
  const { error } = await db().from("answer_bank").delete().eq("id", id);
  if (error) return json({ error: error.message }, 500);
  await db().from("admin_audit").insert({ admin_id: admin.id, action: "bank_delete", meta: { id } });
  return json({ ok: true });
}
