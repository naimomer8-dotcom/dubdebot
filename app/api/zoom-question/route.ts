import { getSession, consentRequired } from "@/lib/session";
import { db } from "@/lib/supabase";
import { alert } from "@/lib/alerts";

export const runtime = "nodejs";

/**
 * A member sends Nir a question for the monthly strategy zoom (Nir: send it 24 hours before,
 * and he answers it specifically in the zoom). Stored as an event; the team gets an email.
 */
export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!s.consent) return consentRequired();
  const { question } = (await req.json().catch(() => ({}))) as { question?: string };
  const q = String(question ?? "").trim().slice(0, 1200);
  if (q.length < 8) return Response.json({ error: "השאלה קצרה מדי" }, { status: 400 });
  const supabase = db();
  const { data: u } = await supabase.from("users").select("full_name, phone, email, plan").eq("id", s.userId).single();
  if (u?.plan !== "paid") return Response.json({ error: "הזום החודשי פתוח למנויי הפלטפורמה" }, { status: 403 });
  const month = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit" }).format(new Date());
  const { count } = await supabase.from("events").select("id", { count: "exact", head: true }).eq("user_id", s.userId).eq("type", "zoom_question").gte("created_at", new Date(Date.now() - 30 * 86400_000).toISOString());
  if ((count ?? 0) >= 3) return Response.json({ error: "אפשר לשלוח עד 3 שאלות לכל זום" }, { status: 429 });
  await supabase.from("events").insert({ user_id: s.userId, type: "zoom_question", meta: { question: q, month } });
  await alert(`zoomq:${s.userId}:${Date.now()}`, "שאלה חדשה לזום החודשי עם ניר", [`${u?.full_name ?? ""} · ${u?.phone ?? ""} · ${u?.email ?? ""}`, "", q], 0);
  return Response.json({ ok: true });
}
