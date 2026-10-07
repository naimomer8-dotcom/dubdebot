import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { setSession } from "@/lib/session";
import { verifyPassword } from "@/lib/password";
import { clientIp, hit, limited } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!email || !password) return NextResponse.json({ error: "צריך מייל וסיסמה" }, { status: 400 });

  const ip = clientIp(req);
  if ((await limited(`e:${email}`, "login_fail", 8, 15)) || (await limited(`ip:${ip}`, "login_fail", 25, 15))) {
    return NextResponse.json({ error: "יותר מדי ניסיונות. נסה שוב בעוד רבע שעה, או שחזר סיסמה." }, { status: 429 });
  }

  const { data: user } = await db().from("users").select("id, password_hash, session_version").eq("email", email).maybeSingle();
  const ok = await verifyPassword(password, user?.password_hash ?? "scrypt$16384$AAAAAAAAAAAAAAAAAAAAAA$" + "A".repeat(86));
  if (!user || !ok) {
    await Promise.all([hit(`e:${email}`, "login_fail"), hit(`ip:${ip}`, "login_fail")]);
    if (user && !user.password_hash) {
      return NextResponse.json({ error: "לחשבון הזה עוד אין סיסמה. לחץ על ״שכחתי סיסמה״ ונשלח לך קישור לקביעת סיסמה.", needsReset: true }, { status: 401 });
    }
    return NextResponse.json({ error: "המייל או הסיסמה לא נכונים" }, { status: 401 });
  }
  await db().from("users").update({ last_seen_at: new Date().toISOString() }).eq("id", user.id);
  await setSession(user.id, user.session_version);
  return NextResponse.json({ ok: true });
}
