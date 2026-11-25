import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { getSession, consentRequired } from "@/lib/session";
import { gemini, CHAT_MODEL, FAST_THINKING } from "@/lib/gemini";
import { logActivity, openOnboardingLead } from "@/lib/crm";
import { PROFILE, QUESTIONS, STATIONS, buildFallbackReport, grade, reportPrompt, sanitizeReport, scoreCheckup, type Profile } from "@/lib/checkup";

export const runtime = "nodejs";
export const maxDuration = 60;

function cleanAnswers(raw: unknown) {
  const out: Record<string, number> = {};
  const r = (raw ?? {}) as Record<string, unknown>;
  for (const q of QUESTIONS) {
    const v = Number(r[q.id]);
    if (r[q.id] !== undefined && Number.isInteger(v) && v >= 0 && v <= 3) out[q.id] = v;
  }
  return out;
}
function cleanProfile(raw: unknown): Profile {
  const r = (raw ?? {}) as Record<string, unknown>;
  const out: Profile = {};
  for (const f of PROFILE) {
    const v = r[f.id];
    if (typeof v !== "string" || !v.trim()) continue;
    if (f.options && !f.options.includes(v)) continue;
    out[f.id] = v.trim().slice(0, 80);
  }
  return out;
}

async function contact(userId: string) {
  const { data } = await db().from("users").select("full_name, phone, email").eq("id", userId).maybeSingle();
  return { full_name: (data?.full_name as string) ?? null, phone: (data?.phone as string) ?? null, email: (data?.email as string) ?? null };
}
async function leadFor(userId: string) {
  const c = await contact(userId);
  const id = await openOnboardingLead({ userId, fullName: c.full_name ?? "", phone: c.phone, email: c.email, source: "checkup" }).catch(() => null);
  return { id, c };
}

/** The member's latest checkup (in progress or done). */
export async function GET() {
  const sess = await getSession();
  if (!sess) return NextResponse.json({ error: "login" }, { status: 401 });
  const { data } = await db().from("checkup_results").select("id, status, step, profile, answers, scores, total, report, finished_at").eq("user_id", sess.userId).order("started_at", { ascending: false }).limit(1).maybeSingle();
  return NextResponse.json({ ok: true, checkup: data ?? null });
}

/** { action: "progress", step, profile, answers } saves as you go; { action: "finish" } scores and writes the plan. */
export async function POST(req: Request) {
  const sess = await getSession();
  if (!sess) return NextResponse.json({ error: "login" }, { status: 401 });
  if (!sess.consent) return consentRequired();
  const userId = sess.userId;
  const body = await req.json().catch(() => ({}));
  const supabase = db();
  const profile = cleanProfile(body.profile);
  const answers = cleanAnswers(body.answers);
  const step = Math.max(0, Math.min(99, Number(body.step) || 0));

  const { data: cur } = await supabase.from("checkup_results").select("id, status").eq("user_id", userId).eq("status", "in_progress").order("started_at", { ascending: false }).limit(1).maybeSingle();
  let id = cur?.id as string | undefined;
  const now = new Date().toISOString();

  if (!id) {
    const { data, error } = await supabase.from("checkup_results").insert({ user_id: userId, step, profile, answers }).select("id").single();
    if (error || !data) return NextResponse.json({ ok: false }, { status: 500 });
    id = data.id as string;
    const { id: leadId, c } = await leadFor(userId);
    if (leadId) await logActivity({ leadId, userId, adminId: null, kind: "note", body: "התחיל את הצ'קאפ העסקי + תוכנית 2027. אם לא יסיים, לחזור אליו ולעזור להשלים (רבע שעה עם יועץ).", contact: c });
    await supabase.from("events").insert({ user_id: userId, type: "checkup_started", meta: {} });
  } else {
    await supabase.from("checkup_results").update({ step, profile, answers, updated_at: now }).eq("id", id);
  }

  if (body.action !== "finish") return NextResponse.json({ ok: true, id });

  if (Object.keys(answers).length < QUESTIONS.length) return NextResponse.json({ error: "incomplete" }, { status: 400 });
  const { scores, params, total } = scoreCheckup(answers);
  const fallback = buildFallbackReport(profile, scores, total);
  let report = fallback;
  try {
    const res = await gemini().models.generateContent({
      model: CHAT_MODEL,
      contents: [{ role: "user", parts: [{ text: reportPrompt(profile, params, scores, total) }] }],
      config: { responseMimeType: "application/json", maxOutputTokens: 6000, ...FAST_THINKING },
    });
    const txt = (res.text ?? "").trim().replace(/^```json\s*|```$/g, "");
    report = sanitizeReport(JSON.parse(txt), fallback);
  } catch (e) {
    console.error("checkup report fell back", e);
  }

  await supabase.from("checkup_results").update({ status: "done", step, profile, answers, scores, total, report, updated_at: now, finished_at: now }).eq("id", id);
  await supabase.from("events").insert({ user_id: userId, type: "checkup_completed", meta: { total } });

  const weak = [...STATIONS].sort((a, b) => scores[a.id] - scores[b.id]).slice(0, 3);
  const { id: leadId, c } = await leadFor(userId);
  if (leadId) {
    const g = grade(total);
    const line = `סיים צ'קאפ עסקי: ${total}/10 (${g.word}). ${profile.business ? `${profile.business} · ` : ""}${profile.field ?? ""}${profile.revenue ? ` · ${profile.revenue}` : ""}. החולשות: ${weak.map((w) => `${w.label} ${scores[w.id]}`).join(", ")}. המטרה ל-2027: ${profile.goal ?? "-"}. תוכנית מלאה: /checkup/report?id=${id}`;
    await logActivity({ leadId, userId, adminId: null, kind: "note", body: `${line}\nלשיחה: לפתוח מהתוכנית, להציע ליישם אותה במסלול או בפגישת יועץ.`, contact: c, meta: { checkup_id: id, total } });
    await supabase.from("leads").update({ summary: `צ'קאפ 2027: ${total}/10 · ${report.headline}\nמהלך 1: ${report.top3[0]?.title ?? ""} · מהלך 2: ${report.top3[1]?.title ?? ""} · מהלך 3: ${report.top3[2]?.title ?? ""}`, updated_at: now }).eq("id", leadId);
  }
  return NextResponse.json({ ok: true, id, scores, total });
}
