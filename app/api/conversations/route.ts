import { getSession } from "@/lib/session";
import { db } from "@/lib/supabase";

export const runtime = "nodejs";
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

/** The user's conversations (for the sidebar refresh). */
export async function GET() {
  const s = await getSession();
  if (!s) return json({ error: "unauthorized" }, 401);
  const { data } = await db()
    .from("conversations")
    .select("id, title, mode, updated_at, pinned, folder")
    .eq("user_id", s.userId)
    .eq("archived", false)
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(200);
  return json({ conversations: data ?? [] });
}

/** Rename / pin / move to folder / archive one conversation. */
export async function PATCH(req: Request) {
  const s = await getSession();
  if (!s) return json({ error: "unauthorized" }, 401);
  const b = await req.json().catch(() => ({}));
  const id = String(b.id ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id)) return json({ error: "bad id" }, 400);
  const patch: Record<string, unknown> = {};
  if (typeof b.title === "string") {
    const t = b.title.replace(/\s+/g, " ").trim().slice(0, 80);
    if (!t) return json({ error: "השם ריק" }, 400);
    patch.title = t;
  }
  if (typeof b.pinned === "boolean") patch.pinned = b.pinned;
  if (typeof b.archived === "boolean") patch.archived = b.archived;
  if (b.folder === null || typeof b.folder === "string") {
    const f = b.folder === null ? null : b.folder.replace(/\s+/g, " ").trim().slice(0, 40);
    patch.folder = f || null;
  }
  if (!Object.keys(patch).length) return json({ error: "nothing to update" }, 400);
  const { error } = await db().from("conversations").update(patch).eq("id", id).eq("user_id", s.userId);
  if (error) return json({ error: "השמירה נכשלה" }, 500);
  return json({ ok: true });
}

/** Delete a conversation and all its messages (cascade). */
export async function DELETE(req: Request) {
  const s = await getSession();
  if (!s) return json({ error: "unauthorized" }, 401);
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(id)) return json({ error: "bad id" }, 400);
  const { error, count } = await db().from("conversations").delete({ count: "exact" }).eq("id", id).eq("user_id", s.userId);
  if (error) return json({ error: "המחיקה נכשלה" }, 500);
  return json({ ok: true, deleted: count ?? 0 });
}
