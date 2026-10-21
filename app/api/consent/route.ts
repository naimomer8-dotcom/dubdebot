import { db } from "@/lib/supabase";
import { getSession } from "@/lib/session";
import { MARKETING_CONSENT_VERSION, clientIp, consentFields } from "@/lib/legal";

export const runtime = "nodejs";
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

/** Consent gate: a member who never approved marketing consent approves it here (body { accept: true }). */
export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return json({ error: "unauthorized" }, 401);
  const b = await req.json().catch(() => ({}));
  if (b.accept !== true) return json({ error: "צריך לאשר קבלת דיוור כדי להמשיך." }, 422);
  if (s.consent) return json({ ok: true, already: true });
  const supabase = db();
  const ip = clientIp(req);
  const { error } = await supabase.from("users").update(consentFields("gate", ip)).eq("id", s.userId);
  if (error) return json({ error: "משהו השתבש. נסה שוב." }, 500);
  await supabase.from("events").insert({ user_id: s.userId, type: "marketing_consent", meta: { source: "gate", version: MARKETING_CONSENT_VERSION } });
  return json({ ok: true });
}
