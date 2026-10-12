import { getSession } from "@/lib/session";
import { db } from "@/lib/supabase";
import { emit } from "@/lib/automation";

export const runtime = "nodejs";

/** Member self-service: stop (or resume) the automatic ₪69/month renewal after the first year. */
export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return Response.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const mode = b.action === "resume" ? "monthly69" : "cancelled";
  const { data: u } = await db().from("users").select("plan").eq("id", s.userId).single();
  if (u?.plan !== "paid") return Response.json({ error: "אין מנוי פעיל" }, { status: 400 });
  await db().from("users").update({ renewal_mode: mode }).eq("id", s.userId);
  await emit("journey", s.userId, { stage: mode === "cancelled" ? "renewal_cancelled" : "renewal_resumed", transactional: true, text: mode === "cancelled" ? "החידוש החודשי בוטל. הגישה נשארת עד סוף התקופה ששולמה." : "החידוש החודשי חזר לפעול." });
  return Response.json({ ok: true, renewalMode: mode });
}
