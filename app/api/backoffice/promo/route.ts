import { db } from "@/lib/supabase";
import { getAdmin, json } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NETWORKS = ["instagram", "facebook", "tiktok", "youtube", "other"] as const;

/** Back-office: budget spent on boosting organic posts, plus signups to compare against. */
export async function GET() {
  const admin = await getAdmin();
  if (!admin) return json({ error: "unauthorized" }, 401);
  const supabase = db();
  const { data: rows } = await supabase.from("promo_spend").select("id, spent_on, amount, network, note, created_by, created_at").order("spent_on", { ascending: false }).order("created_at", { ascending: false }).limit(500);
  const list = rows ?? [];
  const first = list.length ? list[list.length - 1].spent_on : null;
  let signups = 0;
  if (first) {
    const { count } = await supabase.from("users").select("id", { count: "exact", head: true }).gte("created_at", `${first}T00:00:00+02:00`);
    signups = count ?? 0;
  }
  return json({ rows: list, since: first, signups });
}

export async function POST(req: Request) {
  const admin = await getAdmin();
  if (!admin) return json({ error: "unauthorized" }, 401);
  const b = await req.json().catch(() => ({}));
  const amount = Math.round(Number(String(b.amount ?? "").replace(/[^\d.]/g, "")) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) return json({ error: "סכום לא תקין" }, 400);
  const spent_on = /^\d{4}-\d{2}-\d{2}$/.test(String(b.date ?? "")) ? String(b.date) : new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
  const network = (NETWORKS as readonly string[]).includes(b.network) ? b.network : "other";
  const note = String(b.note ?? "").slice(0, 200) || null;
  const { data, error } = await db().from("promo_spend").insert({ amount, spent_on, network, note, created_by: admin.displayName }).select().single();
  if (error) return json({ error: "db" }, 500);
  return json({ ok: true, row: data });
}

export async function DELETE(req: Request) {
  const admin = await getAdmin();
  if (!admin) return json({ error: "unauthorized" }, 401);
  const { id } = await req.json().catch(() => ({}));
  if (!id) return json({ error: "missing id" }, 400);
  await db().from("promo_spend").delete().eq("id", String(id));
  return json({ ok: true });
}
