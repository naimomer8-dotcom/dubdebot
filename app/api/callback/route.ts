import { NextResponse } from "next/server";
import { cleanName, normalizeIsraeliPhone } from "@/lib/validation";
import { clientIp, hit, limited } from "@/lib/ratelimit";
import { nextWebinar } from "@/lib/webinarDates";

export const runtime = "nodejs";

const PLANS: Record<string, string> = { basic: "Basic", private: "Private", upgrade: "Upgrade", pro: "Pro", unsure: "עוד לא יודע" };

/**
 * Public "call me back in 5 minutes" form from the webinar (second CTA next to "join now").
 * Goes to the same Make flow as the app registrations (REGISTRATIONS_WEBHOOK_URL) → a row in the leads sheet.
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (await limited(`ip:${ip}`, "callback", 5, 60)) return NextResponse.json({ error: "כבר קיבלנו ממך פנייה. נחזור אליך בהקדם." }, { status: 429 });
  const b = await req.json().catch(() => ({}));
  const fullName = cleanName(String(b.fullName ?? ""));
  const phone = normalizeIsraeliPhone(String(b.phone ?? ""));
  const plan = PLANS[String(b.plan ?? "unsure")] ?? PLANS.unsure;
  const errors: Record<string, string> = {};
  if (fullName.length < 2) errors.fullName = "צריך שם";
  if (!phone) errors.phone = "צריך נייד תקין";
  if (Object.keys(errors).length) return NextResponse.json({ errors }, { status: 422 });
  void hit(`ip:${ip}`, "callback").catch(() => {});

  const url = process.env.REGISTRATIONS_WEBHOOK_URL;
  if (!url) return NextResponse.json({ error: "משהו השתבש. נסו שוב בעוד רגע." }, { status: 500 });
  const [y, m, d] = nextWebinar(Date.now() - 2 * 86400_000).split("-");
  const src = String(b.utm_source ?? "").slice(0, 40) || "direct";
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact: { full_name: fullName, phone, email: "", plan: `שיחת 5 דקות · מסלול: ${plan}` }, workshop: false, webinar_date: `${Number(d)}.${Number(m)}.${y}`, source: `callback:${src}` }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error(String(r.status));
  } catch (e) {
    console.error("callback forward", (e as Error).message);
    return NextResponse.json({ error: "משהו השתבש. נסו שוב בעוד רגע." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
