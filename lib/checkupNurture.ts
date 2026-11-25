import { createHmac } from "crypto";
import { db } from "./supabase";
import { alert } from "./alerts";
import { noAstral } from "./journeys";
import { isQuiet, isShabbat, render2 } from "./journeys2";
import { emailLines } from "./dp2";
import { leaks, nis, stationsIn, type Profile, type Report, type Scores } from "./checkup";

/**
 * After the checkup: 4 messages that move a non-member from "I have a plan" to "I execute it with Nir"
 * (buying a Duvdevani Platform plan). WhatsApp (ManyChat template, footer "להסרה השיבו הסר") + email (Rav Messer,
 * unsubscribe link in the template), through the Make scenario "Duvdevani Platform – Checkup 2027 Nurture"
 * (CHECKUP_NURTURE_URL). Marketing: only with consent, never after "הסר", never on Shabbat or at night,
 * and it stops the moment the person opens an account or buys.
 */
const H = 3600_000, D = 24 * H;

export type CkStage = { key: string; after: number; wa: string; subject: string; email: string };

export const CK_STAGES: CkStage[] = [
  {
    key: "ck_d0", after: 2 * H, wa: "ck_d0",
    subject: "התוכנית שלך ל-2027 מוכנה",
    email: "{{first_name}}, ניר כאן. עברתי על הצ׳קאפ שלך.\nיצא לך {{score}}/10, והדליפה הכי גדולה אצלך היא {{weak}}.\nהתוכנית המלאה שלך ל-2027, כולל PDF להורדה:\n{{link}}\nתוכנית לא מבצעת את עצמה. מי שרוצה לבצע אותה איתי, צעד אחרי צעד, מצטרף לפלטפורמה:\n{{plans_url}}",
  },
  {
    key: "ck_d2", after: 2 * D, wa: "ck_d2",
    subject: "כמה עולה לך {{weak}}",
    email: "{{first_name}}, שאלה אחת.\nלפי מה שמסרת בצ׳קאפ, {{weak}} עולה לך {{leak}}. כל חודש שעובר בלי לתקן, זה כסף שלא חוזר.\nבפלטפורמה הבוט שלי עובד איתך בדיוק על זה, 24/6, לפי השיטה שלי:\n{{plans_url}}",
  },
  {
    key: "ck_d5", after: 5 * D, wa: "ck_d5",
    subject: "התחלת את המהלך הראשון?",
    email: "{{first_name}}, ניר כאן. המהלך הראשון בתוכנית שלך: {{move}}.\nהתחלת? אם לא, זה המקום שבו רוב בעלי העסקים נתקעים. לא בגלל ידע, בגלל ביצוע.\nמי שעובד איתי בפלטפורמה מקבל צעד אחרי צעד, ומישהו שמחזיק אותו לביצוע:\n{{plans_url}}",
  },
  {
    key: "ck_d9", after: 9 * D, wa: "ck_d9",
    subject: "2027 מתחילה עכשיו",
    email: "{{first_name}}, זו ההודעה האחרונה שלי על הצ׳קאפ.\n2027 מתחילה בעוד כמה שבועות. העסקים שיגדלו בה הם אלה שהתחילו לתקן עכשיו.\nלהצטרפות לפלטפורמה:\n{{plans_url}}\nמעדיף לבנות את זה עם יועץ, אחד על אחד? בתוכנית שלך יש כפתור ״ליישם עם יועץ״:\n{{link}}",
  },
];

const app = () => process.env.PUBLIC_APP_URL || "https://dubdebot.vercel.app";
export const nurtureOn = () => process.env.CHECKUP_NURTURE === "1" && !!process.env.CHECKUP_NURTURE_URL;

type Row = { id: string; token: string; full_name: string | null; phone: string | null; email: string | null; profile: Profile; scores: Scores; total: number; report: Report; finished_at: string };

function vars(r: Row) {
  const weakest = stationsIn(r.scores).sort((a, b) => r.scores[a.id] - r.scores[b.id])[0];
  const lk = leaks(r.profile, r.scores);
  return {
    first_name: (r.full_name ?? "").split(" ")[0] || "היי",
    score: String(r.total),
    weak: weakest?.label ?? "העסק",
    leak: weakest && lk.per[weakest.id] ? `בערך ${nis(lk.per[weakest.id])} בחודש` : "כסף כל חודש",
    move: (r.report?.top3?.[0]?.action ?? "").replace(/[.\s]+$/, "").slice(0, 160) || "לבחור דבר אחד מהתוכנית ולהתחיל",
    link: `${app()}/checkup/r/${r.token}`,
    plans_url: `${app()}/plans?src=checkup`,
  };
}

/** Which stage is due for this checkup now (latest due wins; earlier unsent ones are skipped). */
function due(r: Row, sent: Set<string>, now: number) {
  const age = now - Date.parse(r.finished_at);
  const open = CK_STAGES.filter((s) => age >= s.after && !sent.has(s.key));
  if (!open.length) return { stage: null as CkStage | null, skip: [] as string[] };
  const stage = open[open.length - 1];
  // a stage more than 2 days late is stale: skip it unless it's the last one
  return { stage, skip: open.slice(0, -1).map((s) => s.key) };
}

/** Called from the 10-minute tick. Returns what it did. */
export async function checkupNurtureTick(dry = false) {
  const now = Date.now();
  if (!nurtureOn() && !dry) return { skipped: "off" };
  if (isShabbat(now) || isQuiet(now)) return { skipped: "quiet/shabbat" };
  const supabase = db();
  const since = new Date(now - 12 * D).toISOString();
  const { data: rows } = await supabase.from("checkup_results")
    .select("id, token, full_name, phone, email, profile, scores, total, report, finished_at, user_id")
    .eq("status", "done").eq("consent", true).eq("opt_out", false).is("user_id", null).not("phone", "is", null).neq("source", "qa")
    .gte("finished_at", since).limit(500);
  const ids = (rows ?? []).map((r) => r.id);
  const { data: sends } = ids.length ? await supabase.from("checkup_sends").select("checkup_id, stage").in("checkup_id", ids) : { data: [] };
  const sentBy = new Map<string, Set<string>>();
  for (const s of sends ?? []) { if (!sentBy.has(s.checkup_id)) sentBy.set(s.checkup_id, new Set()); sentBy.get(s.checkup_id)!.add(s.stage); }
  // stop when the person opened an account (the DP3 journey takes over) or opted out there
  const phones = (rows ?? []).map((r) => r.phone as string);
  const { data: users } = phones.length ? await supabase.from("users").select("phone, marketing_opt_out").in("phone", phones) : { data: [] };
  const known = new Map((users ?? []).map((u) => [u.phone as string, u]));

  const out: string[] = [];
  for (const r of (rows ?? []) as unknown as (Row & { user_id: string | null })[]) {
    if (known.has(r.phone!)) continue;
    const { stage, skip } = due(r, sentBy.get(r.id) ?? new Set(), now);
    if (!stage) continue;
    out.push(`${r.token.slice(0, 6)}:${stage.key}`);
    if (dry) continue;
    for (const k of skip) await supabase.from("checkup_sends").insert({ checkup_id: r.id, stage: k, ok: false });
    const { error } = await supabase.from("checkup_sends").insert({ checkup_id: r.id, stage: stage.key });
    if (error) continue; // already claimed
    const v = vars(r);
    const text = noAstral(render2(stage.email, v));
    const body = JSON.stringify({
      event: "checkup_nurture",
      at: new Date().toISOString(),
      contact: { first_name: v.first_name, phone: r.phone, email: r.email },
      data: { stage: stage.key, whatsapp_template: stage.wa, email: !!r.email, email_subject: noAstral(render2(stage.subject, v)), email_parts: emailLines(text), vars: v },
    });
    const secret = process.env.AUTOMATION_SECRET || process.env.SESSION_SECRET || "";
    try {
      const res = await fetch(process.env.CHECKUP_NURTURE_URL!, { method: "POST", headers: { "Content-Type": "application/json", "X-Signature": createHmac("sha256", secret).update(body).digest("hex") }, body, signal: AbortSignal.timeout(8000) });
      if (!res.ok) { await supabase.from("checkup_sends").update({ ok: false }).eq("checkup_id", r.id).eq("stage", stage.key); await alert("ck_nurture_http", "Make לא מקבל הודעות צ׳קאפ", [`סטטוס ${res.status}`], 60); }
    } catch (e) {
      await supabase.from("checkup_sends").update({ ok: false }).eq("checkup_id", r.id).eq("stage", stage.key);
      await alert("ck_nurture_down", "Make לא זמין (צ׳קאפ)", [(e as Error).message], 60);
    }
  }
  return { due: out.length, list: out.slice(0, 30) };
}
