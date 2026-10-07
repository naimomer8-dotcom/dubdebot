import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { newToken, sha256 } from "@/lib/password";
import { clientIp, hit, limited } from "@/lib/ratelimit";
import { sendToMake } from "@/lib/make";

export const runtime = "nodejs";

/** Always answers the same way (no account enumeration). Sends a 60-minute reset link via the Make auth webhook. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const ip = clientIp(req);
  const generic = NextResponse.json({ ok: true });
  if (!email) return generic;
  if ((await limited(`e:${email}`, "reset", 3, 60)) || (await limited(`ip:${ip}`, "reset", 10, 60))) return generic;
  await Promise.all([hit(`e:${email}`, "reset"), hit(`ip:${ip}`, "reset")]);

  const supabase = db();
  const { data: user } = await supabase.from("users").select("id, full_name, email, phone").eq("email", email).maybeSingle();
  if (!user) return generic;

  const token = newToken();
  await supabase.from("password_resets").insert({
    user_id: user.id,
    token_hash: sha256(token),
    expires_at: new Date(Date.now() + 60 * 60_000).toISOString(),
    ip,
  });
  const origin = process.env.PUBLIC_APP_URL || new URL(req.url).origin;
  await sendToMake(process.env.MAKE_AUTH_WEBHOOK_URL, {
    type: "password_reset",
    email: user.email,
    full_name: user.full_name,
    first_name: user.full_name.split(" ")[0],
    phone: user.phone,
    reset_url: `${origin}/reset?token=${token}`,
    expires_minutes: 60,
    subject: "דובדבוט – קישור לקביעת סיסמה",
  });
  if (!process.env.MAKE_AUTH_WEBHOOK_URL) console.warn("MAKE_AUTH_WEBHOOK_URL not set – reset email not sent");
  return generic;
}
