import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { newToken, sha256 } from "@/lib/password";
import { clientIp, hit, limited } from "@/lib/ratelimit";
import { emit } from "@/lib/automation";
import { emailParts } from "@/lib/journeys";

export const runtime = "nodejs";

/**
 * Always answers the same way (no account enumeration). Sends a 60-minute reset link by email
 * through the Make events webhook (route "password_reset" → Rav Messer).
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const ip = clientIp(req);
  const generic = NextResponse.json({ ok: true });
  if (!email) return generic;
  if ((await limited(`e:${email}`, "reset", 3, 60)) || (await limited(`ip:${ip}`, "reset", 10, 60))) return generic;
  await Promise.all([hit(`e:${email}`, "reset"), hit(`ip:${ip}`, "reset")]);

  const supabase = db();
  const { data: user } = await supabase.from("users").select("id, full_name, email").eq("email", email).maybeSingle();
  if (!user) return generic;

  const token = newToken();
  await supabase.from("password_resets").insert({
    user_id: user.id,
    token_hash: sha256(token),
    expires_at: new Date(Date.now() + 60 * 60_000).toISOString(),
    ip,
  });
  const origin = process.env.PUBLIC_APP_URL || new URL(req.url).origin;
  const resetUrl = `${origin}/reset?token=${token}`;
  const firstName = String(user.full_name ?? "").split(" ")[0];
  const text = [
    `${firstName}, ביקשת לקבוע סיסמה חדשה ל-Duvdevani Platform.`,
    "לוחצים על הכפתור, בוחרים סיסמה, וממשיכים מאיפה שהפסקת.",
    "הקישור תקף לשעה אחת. אם לא ביקשת, אפשר להתעלם מהמייל הזה.",
    `הקישור: ${resetUrl}`,
  ].join("\n");
  const r = await emit("password_reset", user.id, {
    stage: "password_reset",
    track: "service",
    whatsapp_template: "",
    email_subject: "Duvdevani Platform: קישור לקביעת סיסמה",
    text,
    email_parts: emailParts(text),
    vars: { plans_url: resetUrl },
    expires_minutes: 60,
    transactional: true,
  });
  if (!r.sent) console.warn("password reset email not sent", r);
  return generic;
}
