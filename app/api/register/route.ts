import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { setSession } from "@/lib/session";
import { hashPassword, passwordProblem } from "@/lib/password";
import { hit, limited } from "@/lib/ratelimit";
import { cleanName, isEmail, normalizeIsraeliPhone } from "@/lib/validation";
import { sendToMake } from "@/lib/make";
import { MARKETING_CONSENT_TEXT, PRIVACY_VERSION } from "@/lib/legal";

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
  if (Object.keys(errors).length) return NextResponse.json({ errors }, { status: 422 });

  const now = new Date().toISOString();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ua = req.headers.get("user-agent");

  if (await limited(`ip:${ip ?? "unknown"}`, "signup", 12, 60)) {
    return NextResponse.json({ error: "יותר מדי הרשמות מהרשת הזו. נסה שוב בעוד שעה." }, { status: 429 });
  }
  await hit(`ip:${ip ?? "unknown"}`, "signup");

  const supabase = db();
  const { data: existing } = await supabase.from("users").select("id").eq("email", email).maybeSingle();
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
      marketing_consent: marketingConsent,
      marketing_consent_at: marketingConsent ? now : null,
      consent_text: marketingConsent ? MARKETING_CONSENT_TEXT : null,
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

  await setSession(userId);
  return NextResponse.json({ ok: true });
}
