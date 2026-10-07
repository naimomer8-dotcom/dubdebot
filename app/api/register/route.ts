import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { setSession } from "@/lib/session";
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
  const termsAccepted = body.termsAccepted === true;
  const marketingConsent = body.marketingConsent === true;
  const utm = typeof body.utm === "object" && body.utm ? body.utm : {};

  const errors: Record<string, string> = {};
  if (fullName.length < 2) errors.fullName = "צריך שם מלא";
  if (!isEmail(email)) errors.email = "המייל לא תקין";
  if (!phone) errors.phone = "צריך מספר נייד ישראלי תקין";
  if (!termsAccepted) errors.terms = "צריך לאשר את התנאים ומדיניות הפרטיות";
  if (Object.keys(errors).length) return NextResponse.json({ errors }, { status: 422 });

  const now = new Date().toISOString();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ua = req.headers.get("user-agent");

  const supabase = db();
  const { data: existing } = await supabase.from("users").select("id, marketing_consent").eq("email", email).maybeSingle();

  let userId: string;
  if (existing) {
    userId = existing.id;
    const patch: Record<string, unknown> = { full_name: fullName, phone, last_seen_at: now };
    // Consent can only be granted here, never silently revoked; revocation goes through unsubscribe.
    if (marketingConsent && !existing.marketing_consent) {
      Object.assign(patch, { marketing_consent: true, marketing_consent_at: now, consent_text: MARKETING_CONSENT_TEXT, unsubscribed_at: null });
    }
    await supabase.from("users").update(patch).eq("id", userId);
  } else {
    const { data, error } = await supabase
      .from("users")
      .insert({
        full_name: fullName,
        email,
        phone,
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
    userId = data.id;

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
  }

  await setSession(userId);
  return NextResponse.json({ ok: true });
}
