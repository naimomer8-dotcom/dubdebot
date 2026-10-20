import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { guard } from "@/lib/guard";
import { cleanMoneyAnswers, scoreMoney } from "@/lib/money";

export const runtime = "nodejs";

/** Save the money self-check. The score is recomputed on the server and stored in users.profile.money. */
export async function POST(req: Request) {
  const g = await guard("money_check", 20, 60);
  if (g instanceof Response) return g;
  const userId = g;
  const body = await req.json().catch(() => ({}));
  const answers = cleanMoneyAnswers(body.answers);
  if (!answers) return NextResponse.json({ error: "חסרות תשובות" }, { status: 400 });
  const result = scoreMoney(answers);
  const supabase = db();
  const { data: u } = await supabase.from("users").select("profile").eq("id", userId).maybeSingle();
  const profile = (u?.profile as Record<string, unknown>) ?? {};
  const prev = profile.money as { score?: number; at?: string } | undefined;
  const history = Array.isArray(profile.money_history) ? (profile.money_history as unknown[]).slice(-5) : [];
  if (prev?.score !== undefined) history.push({ score: prev.score, at: prev.at });
  const { error } = await supabase.from("users").update({ profile: { ...profile, money: result, money_history: history } }).eq("id", userId);
  if (error) {
    console.error("money save failed", error.message);
    return NextResponse.json({ error: "לא הצלחנו לשמור. נסה שוב." }, { status: 500 });
  }
  await supabase.from("events").insert({ user_id: userId, type: "money_check", meta: { score: result.score, level: result.level } });
  return NextResponse.json({ ok: true, result });
}
