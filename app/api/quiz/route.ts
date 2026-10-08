import { NextResponse } from "next/server";
import { guard } from "@/lib/guard";
import { db } from "@/lib/supabase";
import { DISC_QUESTIONS, SALES_QUESTIONS } from "@/lib/quizzes";
import { discReport, salesReport } from "@/lib/quizReport";

export const runtime = "nodejs";

/** Save a test result to the vault. Pure calculation – no AI call. */
export async function POST(req: Request) {
  const gate = await guard("quiz", 30, 60);
  if (gate instanceof Response) return gate;
  const b = await req.json().catch(() => ({}));
  const quiz = b.quiz === "sales" ? "sales" : b.quiz === "disc" ? "disc" : null;
  if (!quiz) return NextResponse.json({ error: "bad quiz" }, { status: 400 });
  const raw = (b.answers ?? {}) as Record<string, unknown>;
  let rep: { title: string; md: string; summary: string };
  if (quiz === "disc") {
    const a: Record<string, string> = {};
    for (const q of DISC_QUESTIONS) if (["D", "I", "S", "C"].includes(String(raw[q.id]))) a[q.id] = String(raw[q.id]);
    if (Object.keys(a).length < DISC_QUESTIONS.length) return NextResponse.json({ error: "incomplete" }, { status: 400 });
    rep = discReport(a);
  } else {
    const a: Record<string, number> = {};
    for (const q of SALES_QUESTIONS) {
      const v = Number(raw[q.id]);
      if (Number.isInteger(v) && v >= 0 && v <= 3) a[q.id] = v;
    }
    if (Object.keys(a).length < SALES_QUESTIONS.length) return NextResponse.json({ error: "incomplete" }, { status: 400 });
    rep = salesReport(a);
  }
  const supabase = db();
  const { data } = await supabase.from("deliverables").insert({ user_id: gate, kind: `quiz_${quiz}`, title: rep.title, content: rep.md }).select("id").single();
  // remember the result on the profile so the advisor can use it (cheap, one short line)
  const { data: u } = await supabase.from("users").select("profile").eq("id", gate).single();
  const profile = { ...((u?.profile as Record<string, unknown>) ?? {}), [quiz === "disc" ? "communication_style" : "sales_skill"]: rep.summary };
  await supabase.from("users").update({ profile }).eq("id", gate);
  return NextResponse.json({ ok: true, id: data?.id ?? null, ...rep });
}
