import { db } from "@/lib/supabase";
import { verifyPassword } from "@/lib/password";
import { setAdminSession, json } from "@/lib/adminAuth";
import { clientIp, hit, limited } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { username, password } = await req.json().catch(() => ({}));
  const u = String(username ?? "").trim().toLowerCase().slice(0, 60);
  const pw = String(password ?? "").slice(0, 200);
  const ip = clientIp(req);
  if ((await limited(`ip:${ip}`, "admin_login", 10, 15)) || (await limited(`adm:${u}`, "admin_login", 6, 15))) {
    return json({ error: "יותר מדי ניסיונות. נסה שוב בעוד רבע שעה." }, 429);
  }
  const { data: a } = await db().from("admins").select("id, password_hash, session_version").eq("username", u).maybeSingle();
  const ok = await verifyPassword(pw, a?.password_hash ?? "scrypt$16384$AAAAAAAAAAAAAAAAAAAAAA$AAAA");
  if (!a || !a.password_hash || !ok) {
    await Promise.all([hit(`ip:${ip}`, "admin_login"), hit(`adm:${u}`, "admin_login")]);
    return json({ error: "שם משתמש או סיסמה לא נכונים." }, 401);
  }
  await db().from("admins").update({ last_login_at: new Date().toISOString() }).eq("id", a.id);
  await setAdminSession(a.id, a.session_version);
  return json({ ok: true });
}
