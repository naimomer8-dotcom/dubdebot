import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { setSession } from "@/lib/session";
import { hashPassword, passwordProblem, sha256 } from "@/lib/password";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = String(body.token ?? "");
  const password = String(body.password ?? "");
  const problem = passwordProblem(password);
  if (problem) return NextResponse.json({ errors: { password: problem } }, { status: 422 });

  const supabase = db();
  const { data: reset } = await supabase.from("password_resets").select("id, user_id, expires_at, used_at").eq("token_hash", sha256(token)).maybeSingle();
  if (!reset || reset.used_at || new Date(reset.expires_at) < new Date()) {
    return NextResponse.json({ error: "הקישור פג תוקף או כבר נוצל. בקש קישור חדש." }, { status: 400 });
  }
  const { data: user } = await supabase.from("users").select("session_version").eq("id", reset.user_id).single();
  const sv = (user?.session_version ?? 1) + 1;
  await supabase
    .from("users")
    .update({ password_hash: await hashPassword(password), password_set_at: new Date().toISOString(), session_version: sv })
    .eq("id", reset.user_id);
  await supabase.from("password_resets").update({ used_at: new Date().toISOString() }).eq("user_id", reset.user_id).is("used_at", null);
  await setSession(reset.user_id, sv);
  return NextResponse.json({ ok: true });
}
