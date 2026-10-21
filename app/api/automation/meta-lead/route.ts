import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@/lib/supabase";
import { emit } from "@/lib/automation";
import { cleanName, isEmail, normalizeIsraeliPhone } from "@/lib/validation";
import { STAGES, render, emailParts, noAstral } from "@/lib/journeys";
import { nextWebinar, webinarLabel, webinarLinks, WEBINAR_TIME, WEBINAR_WA_GROUP } from "@/lib/webinars";
import { LEGACY_MARKETING_CONSENT_TEXT } from "@/lib/legal";

export const runtime = "nodejs";

/**
 * Meta lead form (DUV | 30 יום מתנה) → Google Sheets → Make → here.
 * Header X-Signature = HMAC-SHA256(raw body, AUTOMATION_SECRET).
 *
 * One person = one user. If the email or phone is already a user, nothing new is created (no duplicates
 * in the app, in Fireberry or in ManyChat). Otherwise the lead is pre-registered: a user without a
 * password, so every journey (welcome, webinar reminders, trial) runs for them, and they claim the account
 * by signing up with the same email + phone, or by "שכחתי סיסמה".
 * The welcome WhatsApp + email goes out right away (not on Shabbat; then the next cron run sends it).
 */
export async function POST(req: Request) {
  const secret = process.env.AUTOMATION_SECRET || process.env.SESSION_SECRET || "";
  const raw = await req.text();
  const sig = Buffer.from(req.headers.get("x-signature") ?? "");
  const want = Buffer.from(createHmac("sha256", secret).update(raw).digest("hex"));
  if (!secret || sig.length !== want.length || !timingSafeEqual(sig, want)) return new Response("bad signature", { status: 401 });

  let b: Record<string, unknown>;
  try {
    b = JSON.parse(raw || "{}");
  } catch {
    return Response.json({ error: "bad json" }, { status: 400 });
  }
  const strip = (v: unknown) => String(v ?? "").replace(/^[a-z]:/, "").trim();
  const fullName = cleanName(strip(b.full_name));
  const email = strip(b.email).toLowerCase();
  const phone = normalizeIsraeliPhone(strip(b.phone));
  const consent = ["true", "1", "yes", "כן"].includes(strip(b.consent).toLowerCase());
  if (!phone && !isEmail(email)) return Response.json({ status: "invalid", reason: "no phone or email" }, { status: 422 });

  const supabase = db();
  const or = [phone ? `phone.eq.${phone}` : "", isEmail(email) ? `email.eq.${email}` : ""].filter(Boolean).join(",");
  const { data: existing } = await supabase.from("users").select("id, password_hash").or(or).limit(1).maybeSingle();
  const meta = {
    source: "meta_lead_form",
    lead_id: strip(b.lead_id),
    form: strip(b.form),
    campaign: strip(b.campaign),
    adset: strip(b.adset),
    ad: strip(b.ad),
    business_field: strip(b.business_field),
    business_age: strip(b.business_age),
  };
  if (existing) {
    await supabase.from("events").insert({ user_id: existing.id, type: "meta_lead_again", meta });
    return Response.json({ status: existing.password_hash ? "existing_user" : "existing_lead", user_id: existing.id });
  }
  if (!phone || !isEmail(email)) return Response.json({ status: "invalid", reason: "need both phone and email" }, { status: 422 });

  const now = new Date().toISOString();
  const { data: u, error } = await supabase
    .from("users")
    .insert({
      full_name: fullName.length >= 2 ? fullName : email.split("@")[0],
      email,
      phone,
      password_hash: null,
      marketing_consent: consent,
      marketing_consent_at: consent ? now : null,
      consent_text: consent ? LEGACY_MARKETING_CONSENT_TEXT : null,
      marketing_consent_text_version: consent ? "meta-lead-form" : null,
      marketing_consent_source: consent ? "meta_lead_form" : null,
      terms_accepted_at: now,
      privacy_version: "meta-lead-form",
      utm: { utm_source: "facebook", utm_medium: "lead_form", utm_campaign: meta.campaign, utm_adset: meta.adset, utm_ad: meta.ad },
      profile: { business_field: meta.business_field, business_age: meta.business_age },
    })
    .select("id")
    .single();
  if (error || !u) return Response.json({ status: "error", error: error?.message }, { status: 500 });
  await supabase.from("events").insert({ user_id: u.id, type: "meta_lead", meta });

  // Fireberry (deduped by phone in Make) + Rav Messer marketing list
  await emit("signup", u.id, { marketing_consent: consent, utm: { utm_source: "facebook", utm_medium: "lead_form", utm_campaign: meta.campaign, utm_adset: meta.adset, utm_ad: meta.ad }, source: "meta_lead_form" });

  // welcome now (marketing → needs consent; never on Shabbat)
  const il = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jerusalem", weekday: "short", hour: "numeric", hour12: false }).formatToParts(new Date());
  const day = il.find((p) => p.type === "weekday")?.value;
  const hour = Number(il.find((p) => p.type === "hour")?.value ?? 12);
  const shabbat = day === "Sat" || (day === "Fri" && hour >= 16);
  let welcomed = false;
  if (consent && !shabbat) {
    const st = STAGES.find((s) => s.key === "t_d1_noq")!;
    const { error: claim } = await supabase.from("journey_sends").insert({ user_id: u.id, stage: st.key });
    if (!claim) {
      const app = process.env.PUBLIC_APP_URL || "https://dubdebot.vercel.app";
      const wDate = nextWebinar();
      const wLink = (await webinarLinks().catch(() => ({} as Record<string, string>)))[wDate];
      const vars = { first_name: fullName.split(" ")[0], app_url: app, plans_url: `${app}/plans`, webinar: webinarLabel(wDate), webinar_time: WEBINAR_TIME, webinar_url: wLink || `${app}/w`, wa_group: WEBINAR_WA_GROUP, webinar_next: webinarLabel(wDate) };
      const text = render(st.text, vars);
      const r = await emit("journey", u.id, { stage: st.key, track: st.track, whatsapp_template: st.wa, email_subject: noAstral(render(st.subject, vars)), text, email_parts: emailParts(text), vars, transactional: false });
      welcomed = !!r.sent;
      if (!r.sent) await supabase.from("journey_sends").update({ ok: false }).eq("user_id", u.id).eq("stage", st.key);
    }
  }
  return Response.json({ status: "created", user_id: u.id, welcomed });
}
