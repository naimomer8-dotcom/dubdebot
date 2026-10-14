import { getAdmin, json } from "@/lib/adminAuth";
import { db } from "@/lib/supabase";

export const runtime = "nodejs";

/** Back-office: the members' questions for the monthly zoom, newest first (last 45 days). */
export async function GET() {
  if (!(await getAdmin())) return json({ error: "unauthorized" }, 401);
  const supabase = db();
  const { data } = await supabase.from("events").select("user_id, meta, created_at").eq("type", "zoom_question").gte("created_at", new Date(Date.now() - 45 * 86400_000).toISOString()).order("created_at", { ascending: false }).limit(500);
  const ids = [...new Set((data ?? []).map((e) => e.user_id))];
  const { data: users } = ids.length ? await supabase.from("users").select("id, full_name, phone").in("id", ids) : { data: [] };
  const by = new Map((users ?? []).map((u) => [u.id, u]));
  return json({ questions: (data ?? []).map((e) => ({ at: e.created_at, name: by.get(e.user_id)?.full_name ?? "", phone: by.get(e.user_id)?.phone ?? "", question: (e.meta as { question?: string })?.question ?? "" })) });
}
