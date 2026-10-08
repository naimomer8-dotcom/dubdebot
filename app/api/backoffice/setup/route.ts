import { db } from "@/lib/supabase";
import { hashPassword, passwordProblem, sha256 } from "@/lib/password";
import { setAdminSession, json } from "@/lib/adminAuth";
import { clientIp, hit, limited } from "@/lib/ratelimit";

export const runtime = "nodejs";

/** One-time setup link: the admin chooses their own password. */
export async function POST(req: Request) {
  const { token, password } = await req.json().catch(() => ({}));
  const ip = clientIp(req);
  if (await limited(`ip:${ip}`, "admin_setup", 10, 30)) return json({ error: "יותר מדי ניסיונות." }, 429);
  const t = String(token ?? "");
  const pw = String(password ?? "");
  const problem = passwordProblem(pw);
  if (problem) return json({ errors: { password: problem } }, 422);
  if (pw.length < 10) return json({ errors: { password: "לחשבון מנהל – לפחות 10 תווים" } }, 422);
  const { data: a } = await db().from("admins").select("id, setup_expires_at, session_version").eq("setup_token_hash", sha256(t)).maybeSingle();
  if (!a || !a.setup_expires_at || new Date(a.setup_expires_at).getTime() < Date.now()) {
    await hit(`ip:${ip}`, "admin_setup");
    return json({ error: "הקישור לא תקף או שפג תוקפו." }, 400);
  }
  const ver = a.session_version + 1;
  await db().from("admins").update({ password_hash: await hashPassword(pw), setup_token_hash: null, setup_expires_at: null, session_version: ver }).eq("id", a.id);
  await setAdminSession(a.id, ver);
  return json({ ok: true });
}
