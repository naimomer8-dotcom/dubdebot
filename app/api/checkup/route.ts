import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/supabase";
import { getSession } from "@/lib/session";
import { gemini, CHAT_MODEL, FAST_THINKING } from "@/lib/gemini";
import { logActivity, openOnboardingLead } from "@/lib/crm";
import { alert } from "@/lib/alerts";
import { clientIp, hit, limited } from "@/lib/ratelimit";
import { cleanName, isEmail, normalizeIsraeliPhone } from "@/lib/validation";
import { PROFILE, QUESTIONS, STATIONS, answerScore, leaks, nis, buildFallbackReport, grade, reportPrompt, sanitizeReport, scoreCheckup, type Profile } from "@/lib/checkup";

export const runtime = "nodejs";
export const maxDuration = 60;

const APP = process.env.NEXT_PUBLIC_APP_URL || "https://dubdebot.vercel.app";

function cleanAnswers(raw: unknown) {
  const out: Record<string, number> = {};
  const r = (raw ?? {}) as Record<string, unknown>;
  for (const q of QUESTIONS) {
    if (r[q.id] === undefined || r[q.id] === null) continue;
    const v = Number(r[q.id]);
    if (answerScore(q, v) !== null) out[q.id] = v;
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
async function ensureLead(rowId: string, leadId: string | null, userId: string | null, contact: { full_name: string | null; phone: string | null; email: string | null }, source: string | null, note: string) {
  const supabase = db();
  if (leadId || !contact.phone) return leadId;
  const { data: ex } = await supabase.from("leads").select("id").eq("phone", contact.phone).in("meeting_type", ["checkup", "onboarding"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
  let id = (ex?.id as string) ?? null;
  if (!id) {
    const { data: l } = await supabase.from("leads").insert({ user_id: userId, meeting_type: "checkup", full_name: contact.full_name ?? "", phone: contact.phone, email: contact.email, status: "new", trigger: source ? `checkup:${source}` : "checkup", note }).select("id").single();
    id = (l?.id as string) ?? null;
  }
  if (id) await supabase.from("checkup_results").update({ lead_id: id }).eq("id", rowId);
  return id;
}

const okToken = (t: unknown): t is string => typeof t === "string" && /^[a-zA-Z0-9_-]{16,40}$/.test(t);

/** Resume a checkup by its token. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!okToken(token)) return NextResponse.json({ checkup: null });
  const { data } = await db().from("checkup_results").select("token, status, step, profile, answers, total").eq("token", token).maybeSingle();
  return NextResponse.json({ checkup: data ?? null });
}

/**
 * { action: "progress", token?, step, profile, answers } → saves as you go (creates the row on first call, returns the token).
 * { action: "finish", token, contact: { name, phone, email, consent } } → scores, writes the 2027 plan, opens a CRM lead.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const supabase = db();
  const sess = await getSession().catch(() => null);
  const userId = sess?.userId ?? null;
  const ipKey = `ip:${clientIp(req)}`;
  const profile = cleanProfile(body.profile);
  const answers = cleanAnswers(body.answers);
  const step = Math.max(0, Math.min(99, Number(body.step) || 0));
  const now = new Date().toISOString();
  const source = typeof body.source === "string" ? body.source.slice(0, 40) : null;

  let token: string | null = okToken(body.token) ? body.token : null;
  let row: { id: string; status: string; user_id: string | null; lead_id: string | null } | null = null;
  if (token) {
    const { data } = await supabase.from("checkup_results").select("id, status, user_id, lead_id").eq("token", token).maybeSingle();
    row = data;
  }

  if (!row) {
    if (await limited(ipKey, "checkup", 20, 60)) return NextResponse.json({ error: "too many" }, { status: 429 });
    void hit(ipKey, "checkup").catch(() => {});
    token = randomBytes(18).toString("base64url");
    const { data, error } = await supabase.from("checkup_results").insert({ token, user_id: userId, step, profile, answers, source }).select("id, status, user_id, lead_id").single();
    if (error || !data) return NextResponse.json({ ok: false }, { status: 500 });
    row = data;
    if (userId) {
      const { data: u } = await supabase.from("users").select("full_name, phone, email").eq("id", userId).maybeSingle();
      const leadId = await openOnboardingLead({ userId, fullName: (u?.full_name as string) ?? "", phone: (u?.phone as string) ?? null, email: (u?.email as string) ?? null, source: "checkup" }).catch(() => null);
      if (leadId) {
        await supabase.from("checkup_results").update({ lead_id: leadId }).eq("id", data.id);
        await logActivity({ leadId, userId, adminId: null, kind: "note", body: "התחיל את הצ׳קאפ העסקי + תוכנית 2027. אם לא יסיים, לחזור אליו ולעזור להשלים (רבע שעה עם יועץ).", contact: { phone: (u?.phone as string) ?? null, full_name: (u?.full_name as string) ?? null, email: (u?.email as string) ?? null } });
      }
    }
  } else if (row.status === "in_progress") {
    await supabase.from("checkup_results").update({ step, profile, answers, updated_at: now, ...(userId && !row.user_id ? { user_id: userId } : {}) }).eq("id", row.id);
  }

  // midway: "save my progress" (name + phone) → a lead the rep can call if they don't finish
  if (body.action === "contact") {
    const c = (body.contact ?? {}) as Record<string, unknown>;
    const name = cleanName(String(c.name ?? ""));
    const phone = normalizeIsraeliPhone(String(c.phone ?? ""));
    if (!name || !phone) return NextResponse.json({ error: "contact", errors: { name: !name, phone: !phone } }, { status: 400 });
    await supabase.from("checkup_results").update({ full_name: name, phone }).eq("id", row.id);
    const contact = { full_name: name, phone, email: null };
    const leadId = await ensureLead(row.id, row.lead_id, userId, contact, source, "באמצע הצ׳קאפ העסקי 2027. אם לא יסיים: להתקשר, לעזור להשלים (רבע שעה עם יועץ).");
    if (leadId) await logActivity({ leadId, userId, adminId: null, kind: "note", body: `התחיל צ׳קאפ עסקי 2027 ושמר התקדמות (שלב ${step}). אם לא יסיים תוך יום: להתקשר ולהשלים איתו.`, contact, sync: "onboarding_opened", status: "new" });
    return NextResponse.json({ ok: true, token });
  }

  // from the report: "implement this move with an advisor"
  if (body.action === "callback") {
    if (row.status !== "done") return NextResponse.json({ error: "not done" }, { status: 400 });
    const move = String(body.move ?? "").slice(0, 160);
    const { data: r2 } = await supabase.from("checkup_results").select("full_name, phone, email, total, lead_id").eq("id", row.id).single();
    const contact = { full_name: (r2?.full_name as string) ?? null, phone: (r2?.phone as string) ?? null, email: (r2?.email as string) ?? null };
    const leadId = (r2?.lead_id as string) ?? (await ensureLead(row.id, null, userId, contact, source, "ביקש יועץ מתוך הצ׳קאפ העסקי 2027."));
    if (leadId) {
      await supabase.from("leads").update({ status: "callback", next_call_at: now, updated_at: now }).eq("id", leadId);
      await logActivity({ leadId, userId, adminId: null, kind: "note", body: `ליד חם מהצ׳קאפ (${r2?.total}/10): ביקש יועץ ליישום המהלך "${move}". להתקשר היום ולהציע פגישת יועץ (₪279) או מסלול.\nהתוכנית: ${APP}/checkup/r/${token}`, contact, status: "callback" });
    }
    await alert(`checkup_cb:${token}`, `ליד חם מהצ׳קאפ: ${contact.full_name ?? ""} רוצה יועץ`, [`${contact.full_name ?? ""} · ${contact.phone ?? ""}`, `מהלך: ${move}`, `${APP}/checkup/r/${token}`], 5).catch(() => {});
    return NextResponse.json({ ok: true });
  }

  if (body.action !== "finish") return NextResponse.json({ ok: true, token });
  if (row.status === "done") return NextResponse.json({ ok: true, token, done: true });

  // ---------- finish ----------
  const { data: saved } = await supabase.from("checkup_results").select("profile, answers").eq("id", row.id).single();
  const allAnswers = { ...((saved?.answers ?? {}) as Record<string, number>), ...answers };
  const allProfile = { ...((saved?.profile ?? {}) as Profile), ...profile };
  if (QUESTIONS.some((q) => allAnswers[q.id] === undefined)) return NextResponse.json({ error: "incomplete" }, { status: 400 });

  const c = (body.contact ?? {}) as Record<string, unknown>;
  const name = cleanName(String(c.name ?? ""));
  const phone = normalizeIsraeliPhone(String(c.phone ?? ""));
  const email = isEmail(String(c.email ?? "")) ? String(c.email).trim().toLowerCase() : null;
  if (!userId && (!name || !phone)) return NextResponse.json({ error: "contact", errors: { name: !name, phone: !phone } }, { status: 400 });

  const { scores, params, total } = scoreCheckup(allAnswers);
  const fallback = buildFallbackReport(allProfile, scores, total);
  let report = fallback;
  try {
    const res = await gemini().models.generateContent({
      model: CHAT_MODEL,
      contents: [{ role: "user", parts: [{ text: reportPrompt(allProfile, params, scores, total) }] }],
      config: { responseMimeType: "application/json", maxOutputTokens: 6000, ...FAST_THINKING },
    });
    const txt = (res.text ?? "").trim().replace(/^```json\s*|```$/g, "");
    report = sanitizeReport(JSON.parse(txt), fallback);
  } catch (e) {
    console.error("checkup report fell back", e);
  }

  // contact: from the form, or the member's account
  let contact = { full_name: name || null, phone: phone || null, email };
  if (userId && (!contact.phone || !contact.full_name)) {
    const { data: u } = await supabase.from("users").select("full_name, phone, email").eq("id", userId).maybeSingle();
    contact = { full_name: contact.full_name ?? (u?.full_name as string) ?? null, phone: contact.phone ?? (u?.phone as string) ?? null, email: contact.email ?? (u?.email as string) ?? null };
  }

  await supabase.from("checkup_results").update({ status: "done", step, profile: allProfile, answers: allAnswers, scores, total, report, full_name: contact.full_name, phone: contact.phone, email: contact.email, updated_at: now, finished_at: now }).eq("id", row.id);
  if (userId) await supabase.from("events").insert({ user_id: userId, type: "checkup_completed", meta: { total } });

  // CRM: the member's onboarding lead, or a new "checkup" lead
  const { data: rl } = await supabase.from("checkup_results").select("lead_id").eq("id", row.id).single();
  const leadId = await ensureLead(row.id, (rl?.lead_id as string) ?? row.lead_id, userId, contact, source, "מילא צ׳קאפ עסקי 2027 וקיבל תוכנית עסקית. להתקשר, לפתוח מהתוכנית, להציע יישום במסלול או בפגישת יועץ.");
  const weak = [...STATIONS].sort((a, b) => scores[a.id] - scores[b.id]).slice(0, 3);
  const g = grade(total);
  const link = `${APP}/checkup/r/${token}`;
  if (leadId) {
    const line = `סיים צ׳קאפ עסקי: ${total}/10 (${g.word}). ${allProfile.business ? `${allProfile.business} · ` : ""}${allProfile.field ?? ""}${allProfile.revenue ? ` · ${allProfile.revenue}` : ""}. החולשות: ${weak.map((w) => `${w.label} ${scores[w.id]}`).join(", ")}.${leaks(allProfile, scores).total ? ` דליפה משוערת: ${nis(leaks(allProfile, scores).total)} בחודש.` : ""} המטרה ל-2027: ${allProfile.goal ?? "-"}.\nהתוכנית המלאה: ${link}\nלשיחה: לפתוח מהתוכנית, להציע ליישם אותה במסלול או בפגישת יועץ (₪279).`;
    await logActivity({ leadId, userId, adminId: null, kind: "note", body: line, contact, meta: { checkup_token: token, total }, sync: "onboarding_opened", status: "new" });
    await supabase.from("leads").update({ summary: `צ׳קאפ 2027: ${total}/10 · ${report.headline}\nמהלך 1: ${report.top3[0]?.title ?? ""} · מהלך 2: ${report.top3[1]?.title ?? ""} · מהלך 3: ${report.top3[2]?.title ?? ""}\n${link}`, updated_at: now }).eq("id", leadId);
  }
  await alert(`checkup:${token}`, `צ׳קאפ עסקי חדש: ${contact.full_name ?? ""} · ${total}/10`, [`${contact.full_name ?? ""} · ${contact.phone ?? ""}`, `${g.word}. חולשות: ${weak.map((w) => w.label).join(", ")}`, link], 1).catch(() => {});

  // deliver the plan (WhatsApp + email) through the platform's Make scenario
  const hook = process.env.CHECKUP_WEBHOOK_URL;
  if (hook && contact.phone && c.consent !== false) {
    void fetch(hook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "checkup_done", contact: { first_name: (contact.full_name ?? "").split(" ")[0], phone: contact.phone, email: contact.email }, data: { total, grade: g.word, link, weak: weak.map((w) => w.label) } }) }).catch(() => {});
  }
  return NextResponse.json({ ok: true, token, total });
}
