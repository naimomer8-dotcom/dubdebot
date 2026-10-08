import { db } from "@/lib/supabase";
import { getSession } from "@/lib/session";
import { hit, limited } from "@/lib/ratelimit";
import { normalizeIsraeliPhone } from "@/lib/validation";
import { sendToMake } from "@/lib/make";

export const runtime = "nodejs";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

/** "I want to keep going" – works also after access has expired. Creates a renewal lead for a rep to call. */
export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return json({ error: "unauthorized" }, 401);
  if (await limited(`u:${s.userId}`, "renewal", 5, 60 * 24)) return json({ ok: true, already: true });
  const b = await req.json().catch(() => ({}));
  const supabase = db();
  const { data: u } = await supabase.from("users").select("full_name, phone, email, profile, utm").eq("id", s.userId).single();
  if (!u) return json({ error: "unauthorized" }, 401);
  const phone = normalizeIsraeliPhone(String(b.phone ?? "")) || u.phone;
  const note = String(b.note ?? "").slice(0, 600);
  const preferredTime = String(b.preferredTime ?? "").slice(0, 60);
  await hit(`u:${s.userId}`, "renewal");
  const nowIso = new Date().toISOString();
  const [{ data: lead }] = await Promise.all([
    supabase
      .from("leads")
      .insert({ user_id: s.userId, meeting_type: "renewal", full_name: u.full_name, phone, email: u.email, note: note || null, preferred_time: preferredTime || null, trigger: s.access.status === "expired" ? "expired" : "early_renewal" })
      .select("id, created_at")
      .single(),
    supabase.from("users").update({ renewal_requested_at: nowIso }).eq("id", s.userId),
    supabase.from("events").insert({ user_id: s.userId, type: "renewal_requested", meta: { status: s.access.status, plan: s.access.plan } }),
  ]);
  await sendToMake(process.env.MAKE_LEAD_WEBHOOK_URL, {
    type: "renewal_request",
    lead_id: lead?.id ?? null,
    created_at: lead?.created_at ?? nowIso,
    meeting_type: s.access.plan === "paid" ? "חידוש מנוי שנתי" : "מעבר ממנוי מתנה למנוי שנתי",
    full_name: u.full_name,
    phone,
    phone_intl: phone ? "+972" + phone.slice(1) : null,
    email: u.email,
    preferred_time: preferredTime,
    note,
    access_until: s.access.accessUntil,
    business_profile: u.profile ?? {},
    utm: u.utm ?? {},
    source: "דובדבוט",
  });
  return json({ ok: true });
}
