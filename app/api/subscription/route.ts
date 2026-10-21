import { getSession, consentRequired } from "@/lib/session";
import { db } from "@/lib/supabase";
import { emit } from "@/lib/automation";

export const runtime = "nodejs";

/** Member self-service: stop (or resume) the automatic ₪69/month renewal after the first year. */
export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!s.consent) return consentRequired();
  const b = await req.json().catch(() => ({}));
  const mode = b.action === "resume" ? "monthly69" : "cancelled";
  const { data: u } = await db().from("users").select("plan, year_ends_at, renewal_mode").eq("id", s.userId).single();
  if (u?.plan !== "paid") return Response.json({ error: "אין מנוי פעיל" }, { status: 400 });
  // a cancelled member can come back at ₪69/month within 30 days of the year's end; after that it's a new annual plan
  if (mode === "monthly69" && u.renewal_mode === "cancelled" && u.year_ends_at && Date.now() - new Date(u.year_ends_at).getTime() > 30 * 86400_000)
    return Response.json({ error: "חלון החזרה ב-₪69 נסגר. אפשר להצטרף מחדש לאחד המסלולים." }, { status: 400 });
  await db().from("users").update({ renewal_mode: mode }).eq("id", s.userId);
  await emit("journey", s.userId, { stage: mode === "cancelled" ? "renewal_cancelled" : "renewal_resumed", transactional: true, text: mode === "cancelled" ? "החידוש החודשי בוטל. הגישה נשארת עד סוף התקופה ששולמה." : "החידוש החודשי חזר לפעול." });
  return Response.json({ ok: true, renewalMode: mode });
}
