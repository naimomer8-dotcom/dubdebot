import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { getSessionUserId } from "@/lib/session";
import { QUESTIONS, archetype, score } from "@/lib/xray";
import { clientIp, hit, limited } from "@/lib/ratelimit";

export const runtime = "nodejs";

/** Save an X-ray result (attached to the user when logged in). Scores are recomputed server-side. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const raw = (body.answers ?? {}) as Record<string, unknown>;
  const answers: Record<string, number> = {};
  for (const q of QUESTIONS) {
    const v = Number(raw[q.id]);
    if (Number.isInteger(v) && v >= 0 && v <= 3) answers[q.id] = v;
  }
  if (Object.keys(answers).length < QUESTIONS.length) return NextResponse.json({ error: "incomplete" }, { status: 400 });

  const userId = await getSessionUserId();
  const ipKey = `ip:${clientIp(req)}`;
  if (!userId && (await limited(ipKey, "xray", 30, 60))) return NextResponse.json({ error: "too many" }, { status: 429 });
  if (!userId) void hit(ipKey, "xray").catch(() => {});
  const { scores, total } = score(answers);
  const supabase = db();
  const { data, error } = await supabase
    .from("xray_results")
    .insert({ user_id: userId, answers, scores, total, archetype: archetype(total).id })
    .select("id")
    .single();
  if (error) {
    console.error(error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  if (userId) await supabase.from("events").insert({ user_id: userId, type: "xray_completed", meta: { total } });
  return NextResponse.json({ ok: true, id: data.id, scores, total });
}

/** Attach an anonymous result to the user right after signup. */
export async function PATCH(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await req.json().catch(() => ({}));
  if (typeof id !== "string") return NextResponse.json({ error: "bad id" }, { status: 400 });
  await db().from("xray_results").update({ user_id: userId }).eq("id", id).is("user_id", null);
  return NextResponse.json({ ok: true });
}
