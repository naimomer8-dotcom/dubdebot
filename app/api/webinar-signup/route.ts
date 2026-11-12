import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { cleanName, isEmail, normalizeIsraeliPhone } from "@/lib/validation";
import { clientIp, hit, limited } from "@/lib/ratelimit";
import { MARKETING_CONSENT_TEXT, MARKETING_CONSENT_VERSION } from "@/lib/legal";
import { nextWebinar } from "@/lib/webinarDates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public webinar registration (dubdebot.vercel.app/webinar), for people who are not platform members:
 * community posts, WhatsApp, email lists. Saved in `webinar_signups`, then forwarded to the same Make flow
 * as the in-app registrations (REGISTRATIONS_WEBHOOK_URL) → leads sheet tab "הרשמות סדנה ווובינר" + Fireberry.
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (await limited(`ip:${ip}`, "webinar_signup", 6, 60)) return NextResponse.json({ error: "כבר קיבלנו את ההרשמה שלך. נתראה בוובינר!" }, { status: 429 });
  const b = await req.json().catch(() => ({}));
  const fullName = cleanName(String(b.fullName ?? ""));
  const phone = normalizeIsraeliPhone(String(b.phone ?? ""));
  const email = String(b.email ?? "").trim().toLowerCase();
  const errors: Record<string, string> = {};
  if (fullName.length < 2) errors.fullName = "צריך שם";
  if (!phone) errors.phone = "צריך נייד תקין";
  if (!isEmail(email)) errors.email = "צריך מייל תקין";
  if (b.consent !== true) errors.consent = "צריך לאשר כדי שנוכל לשלוח לכם את הקישור והתזכורות";
  if (Object.keys(errors).length) return NextResponse.json({ errors }, { status: 422 });
  void hit(`ip:${ip}`, "webinar_signup").catch(() => {});

  const date = nextWebinar();
  const utm = {
    source: String(b.utm_source ?? "").slice(0, 60) || "direct",
    medium: String(b.utm_medium ?? "").slice(0, 60),
    campaign: String(b.utm_campaign ?? "").slice(0, 80),
    content: String(b.utm_content ?? "").slice(0, 80),
  };

  const { error } = await db().from("webinar_signups").insert({
    full_name: fullName, phone, email, webinar_date: date, utm,
    consent_text: MARKETING_CONSENT_TEXT, consent_version: MARKETING_CONSENT_VERSION, consent_ip: ip,
  });
  if (error) console.error("webinar_signups insert", error.message);

  const url = process.env.REGISTRATIONS_WEBHOOK_URL;
  let forwarded = false;
  if (url) {
    const [y, m, d] = date.split("-");
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact: { full_name: fullName, phone, email, plan: "נרשם לוובינר מהטופס הציבורי" }, workshop: false, webinar_date: `${Number(d)}.${Number(m)}.${y}`, source: `webinar_form:${utm.source}` }),
        signal: AbortSignal.timeout(8000),
      });
      forwarded = r.ok;
    } catch (e) {
      console.error("webinar signup forward", (e as Error).message);
    }
  }
  if (error && !forwarded) return NextResponse.json({ error: "משהו השתבש. נסו שוב בעוד רגע." }, { status: 500 });
  return NextResponse.json({ ok: true, date });
}
