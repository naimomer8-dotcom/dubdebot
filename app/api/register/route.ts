import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { setSession } from "@/lib/session";
import { hashPassword, passwordProblem } from "@/lib/password";
import { hit, limited } from "@/lib/ratelimit";
import { cleanName, isEmail, normalizeIsraeliPhone } from "@/lib/validation";
import { sendToMake } from "@/lib/make";
import { emit } from "@/lib/automation";
import { PRIVACY_VERSION, MARKETING_CONSENT_VERSION, consentFields, clientIp } from "@/lib/legal";
import { capi, capiCtx } from "@/lib/metaCapi";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  const fullName = cleanName(String(body.fullName ?? ""));
  const email = String(body.email ?? "").trim().toLowerCase();
  const phone = normalizeIsraeliPhone(String(body.phone ?? ""));
  const password = String(body.password ?? "");
  const termsAccepted = body.termsAccepted === true;
  const marketingConsent = body.marketingConsent === true;
  const utm = typeof body.utm === "object" && body.utm ? body.utm : {};

  const errors: Record<string, string> = {};
  if (fullName.length < 2) errors.fullName = "צריך שם מלא";
  if (!isEmail(email)) errors.email = "המייל לא תקין";
  if (!phone) errors.phone = "צריך מספר נייד ישראלי תקין";
  const pwProblem = passwordProblem(password);
  if (pwProblem) errors.password = pwProblem;
  if (!termsAccepted) errors.terms = "צריך לאשר את התנאים ומדיניות הפרטיות";
  // marketing consent is required to open an account (checked here, not only in the form)
  if (!marketingConsent) errors.marketing = "צריך לאשר קבלת דיוור כדי להירשם";
  if (Object.keys(errors).length) return NextResponse.json({ errors }, { status: 422 });

  const now = new Date().toISOString();
  const ip = clientIp(req);
  const ua = req.headers.get("user-agent");

  // mobile carriers put many people behind one IP – keep this generous; the email check stops duplicates
  if (await limited(`ip:${ip ?? "unknown"}`, "signup", 500, 60)) {
    return NextResponse.json({ error: "יותר מדי הרשמות מהרשת הזו. נסה שוב בעוד שעה." }, { status: 429 });
  }
  await hit(`ip:${ip ?? "unknown"}`, "signup");

  const supabase = db();
  const { data: existing } = await supabase.from("users").select("id, phone, password_hash").eq("email", email).maybeSingle();
  // pre-registered from the Meta lead form (no password yet): the same email + phone claims the account
  if (existing && !existing.password_hash && existing.phone === phone) {
    await supabase
      .from("users")
      .update({
        full_name: fullName,
        password_hash: await hashPassword(password),
        password_set_at: now,
        ...consentFields("signup_claim", ip, now),
        terms_accepted_at: now,
        privacy_version: PRIVACY_VERSION,
        signup_ip: ip,
        user_agent: ua,
        access_until: new Date(Date.now() + 30 * 86400_000).toISOString(), // the gift month starts when they start
      })
      .eq("id", existing.id);
    await supabase.from("events").insert({ user_id: existing.id, type: "marketing_consent", meta: { source: "signup_claim", version: MARKETING_CONSENT_VERSION } });
    await emit("signup", existing.id, { marketing_consent: marketingConsent, utm, claimed: true });
    await setSession(existing.id);
    const eventId = `reg_${existing.id}`;
    await capi("CompleteRegistration", eventId, { email, phone, userId: existing.id, ...capiCtx(req) }, { content_name: "30 יום במתנה", status: "claimed" });
    return NextResponse.json({ ok: true, claimed: true, eventId });
  }
  if (existing) {
    // never log someone into an existing account from the signup form
    return NextResponse.json(
      { errors: { email: "המייל הזה כבר רשום. התחבר, או שחזר סיסמה אם שכחת." }, exists: true },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from("users")
    .insert({
      full_name: fullName,
      email,
      phone,
      password_hash: await hashPassword(password),
      password_set_at: now,
      ...consentFields("signup", ip, now),
      terms_accepted_at: now,
      privacy_version: PRIVACY_VERSION,
      signup_ip: ip,
      user_agent: ua,
      utm,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error(error);
    return NextResponse.json({ error: "משהו השתבש. נסה שוב." }, { status: 500 });
  }
  const userId = data.id;

  await sendToMake(process.env.MAKE_SIGNUP_WEBHOOK_URL, {
    type: "signup",
    user_id: userId,
    full_name: fullName,
    email,
    phone,
    marketing_consent: marketingConsent,
    utm,
    created_at: now,
  });

  await supabase.from("events").insert({ user_id: userId, type: "marketing_consent", meta: { source: "signup", version: MARKETING_CONSENT_VERSION } });
  await emit("signup", userId, { marketing_consent: marketingConsent, utm });
  await setSession(userId);
  const eventId = `reg_${userId}`;
  await capi("CompleteRegistration", eventId, { email, phone, userId, ...capiCtx(req) }, { content_name: "30 יום במתנה", status: "new" });
  return NextResponse.json({ ok: true, eventId });
}
