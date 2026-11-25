import { db } from "@/lib/supabase";
import { alert } from "@/lib/alerts";
import { dp2Live, dp2On, meetingWhen, sendDp2 } from "@/lib/dp2";
import { dueDayStage, ilParts, isQuiet, isShabbat } from "@/lib/journeys2";
import { checkupNurtureTick } from "@/lib/checkupNurture";

export const runtime = "nodejs";
export const maxDuration = 300;

const H = 3600_000;
const D = 24 * H;

/**
 * DP2 tick (every 10 minutes, from Supabase pg_cron). Bearer CRON_SECRET or DP2_TICK_TOKEN.
 * 1. queued messages whose time has come (quiet hours / Shabbat / "an hour after the meeting")
 * 2. meeting reminders: 20:00 the evening before, and 2 hours before
 * 3. trial / lost day messages (10:00–20:00, one per person per day)
 * 4. team alerts: lead still "new" after 20h, meeting not marked 30 min after, morning summary 08:30
 * ?dry=1 lists what would happen.
 */
export async function GET(req: Request) {
  // Vercel cron (CRON_SECRET) or the Supabase pg_cron job (DP2_TICK_TOKEN, kept in Supabase Vault)
  const auth = req.headers.get("authorization") ?? "";
  const okAuth = [process.env.CRON_SECRET, process.env.DP2_TICK_TOKEN].some((s) => !!s && auth === `Bearer ${s}`);
  if (!okAuth) return new Response("unauthorized", { status: 401 });
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  if (!dp2On() && !dry) return Response.json({ skipped: "DP2 off" });
  const supabase = db();
  const now = Date.now();
  const out: Record<string, unknown> = {};
  const customerOk = !isShabbat(now) && !isQuiet(now);

  // 1 · queue
  if (customerOk) {
    const { data: q } = await supabase.from("dp2_queue").select("id, user_id, stage, claim, extra").lte("send_after", new Date(now).toISOString()).is("done_at", null).limit(300);
    let n = 0;
    for (const row of q ?? []) {
      if (dry) { n++; continue; }
      await supabase.from("dp2_queue").update({ done_at: new Date().toISOString() }).eq("id", row.id);
      // after_meeting only if nobody bought in between
      if (row.stage === "after_meeting") {
        const { data: u } = await supabase.from("users").select("plan").eq("id", row.user_id).maybeSingle();
        if (u?.plan === "paid") continue;
      }
      const r = await sendDp2(row.user_id, row.stage, { claim: row.claim, extra: row.extra ?? {}, allowQuiet: true });
      if (r.sent) n++;
    }
    out.queue = n;
  }

  // leads with a meeting around now
  const { data: meetings } = await supabase
    .from("leads")
    .select("id, user_id, full_name, phone, status, meeting_at, assigned_to")
    .eq("status", "scheduled")
    .gte("meeting_at", new Date(now - 3 * H).toISOString())
    .lte("meeting_at", new Date(now + 30 * H).toISOString())
    .limit(1000);
  const adminIds = [...new Set((meetings ?? []).map((m) => m.assigned_to).filter(Boolean))] as string[];
  const names = new Map<string, string>();
  if (adminIds.length) {
    const { data: a } = await supabase.from("admins").select("id, display_name").in("id", adminIds);
    for (const x of a ?? []) names.set(x.id, x.display_name);
  }

  // 2 · reminders (service messages; the evening one at 20:00 is before quiet hours, the 2h one only in daytime)
  const rem: string[] = [];
  const il = ilParts(now);
  for (const m of meetings ?? []) {
    if (!m.user_id || !m.meeting_at) continue;
    const t = Date.parse(m.meeting_at);
    const extra = { meeting_when: meetingWhen(m.meeting_at), rep_name: m.assigned_to ? names.get(m.assigned_to) : undefined };
    const meetDay = new Date(t).toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
    const tomorrow = new Date(now + D).toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
    if (meetDay === tomorrow && il.min >= 20 * 60 && il.min < 21 * 60 && !isShabbat(now)) {
      rem.push(`eve:${m.id}`);
      if (!dry) await sendDp2(m.user_id, "reminder", { claim: `dp2:reminder_eve:${m.id}:${m.meeting_at}`, extra, allowQuiet: true });
    }
    if (t - now <= 2 * H && t - now > 50 * 60_000 && !isShabbat(now)) {
      rem.push(`2h:${m.id}`);
      if (!dry) await sendDp2(m.user_id, "reminder", { claim: `dp2:reminder_2h:${m.id}:${m.meeting_at}`, extra, allowQuiet: true });
    }
    // 4b · meeting passed 30 minutes ago and still "scheduled"
    if (now - t >= 30 * 60_000 && !dry) {
      const rep = m.assigned_to ? names.get(m.assigned_to) ?? "" : "";
      await alert(`dp2_nomark:${m.id}`, `פגישה בלי סימון: ${m.full_name}`, [`${m.full_name} · ${m.phone}`, `הפגישה הייתה ב-${meetingWhen(m.meeting_at)}${rep ? ` עם ${rep}` : ""}.`, "לסמן ב-CRM: הפגישה התקיימה, או לא הגיע."], 60 * 24 * 7);
    }
  }
  out.reminders = rem;

  // 3 · day messages, 10:00–20:00 on working hours only
  if (!isShabbat(now) && il.min >= 10 * 60 && il.min < 20 * 60) {
    const since = new Date(now - 100 * D).toISOString();
    const [{ data: users }, { data: leads }, { data: sends }] = await Promise.all([
      supabase.from("users").select("id, phone, plan, created_at, access_until, questions_count").gte("created_at", since).neq("plan", "paid").limit(20000),
      supabase.from("leads").select("user_id, status, meeting_at, next_call_at, created_at").eq("meeting_type", "onboarding").gte("created_at", since).limit(20000),
      supabase.from("journey_sends").select("user_id, stage, sent_at").like("stage", "dp2:%").gte("sent_at", since).limit(200000),
    ]);
    const ids = (users ?? []).map((u) => u.id);
    const fin = new Set<string>();
    const xr = new Set<string>();
    for (let i = 0; i < ids.length; i += 500) {
      const chunk = ids.slice(i, i + 500);
      const [{ data: f }, { data: x }] = await Promise.all([
        supabase.from("financials").select("user_id").in("user_id", chunk),
        supabase.from("xray_results").select("user_id").in("user_id", chunk),
      ]);
      for (const r of f ?? []) fin.add(r.user_id);
      for (const r of x ?? []) xr.add(r.user_id);
    }
    const lead = new Map<string, { status: string; meeting_at: string | null; next_call_at: string | null }>();
    for (const l of leads ?? []) if (l.user_id && !lead.has(l.user_id)) lead.set(l.user_id, l);
    const sent = new Map<string, Set<string>>();
    const last = new Map<string, number>();
    for (const s of sends ?? []) {
      const set = sent.get(s.user_id) ?? new Set<string>();
      set.add(s.stage);
      sent.set(s.user_id, set);
      // day messages count toward the one-a-day cap (meeting and reminder messages do not)
      if (!/^dp2:(meeting_set|reminder_|no_answer|no_show)/.test(s.stage)) last.set(s.user_id, Math.max(last.get(s.user_id) ?? 0, Date.parse(s.sent_at)));
    }
    const due: { id: string; key: string }[] = [];
    const test = (process.env.DP2_TEST_PHONES ?? "").split(",").map((p) => p.replace(/\D/g, "").replace(/^972/, "0")).filter(Boolean);
    for (const u of users ?? []) {
      if (!dp2Live() && !test.includes(String(u.phone ?? ""))) continue;
      if ((last.get(u.id) ?? 0) > now - 20 * H) continue;
      const l = lead.get(u.id);
      const key = dueDayStage(
        { createdAt: Date.parse(u.created_at), accessUntil: u.access_until ? Date.parse(u.access_until) : null, paid: u.plan === "paid", questions: u.questions_count ?? 0, hasFinancials: fin.has(u.id), hasXray: xr.has(u.id), leadStatus: l?.status ?? null, meetingAt: l?.meeting_at ? Date.parse(l.meeting_at) : null, callPicked: !!l?.next_call_at },
        sent.get(u.id) ?? new Set(),
        now,
      );
      if (key) due.push({ id: u.id, key });
    }
    out.day = dry ? due.slice(0, 100) : due.length;
    if (!dry) {
      const queue = due.slice(0, 400);
      const worker = async () => { for (let j = queue.shift(); j; j = queue.shift()) await sendDp2(j.id, j.key, { allowQuiet: true }); };
      await Promise.all(Array.from({ length: 6 }, worker));
    }
  }

  // 4 · team alerts
  if (!dry) {
    const { data: stale } = await supabase.from("leads").select("id, full_name, phone, created_at").eq("status", "new").eq("meeting_type", "onboarding").lte("created_at", new Date(now - 20 * H).toISOString()).gte("created_at", new Date(now - 7 * D).toISOString()).limit(200);
    if (stale?.length && !isShabbat(now) && !isQuiet(now)) {
      await alert("dp2_sla", `${stale.length} לידים עדיין "חדש" אחרי 20 שעות`, [...stale.slice(0, 30).map((l) => `${l.full_name} · ${l.phone}`), "", "לטפל לפני שעובר יום."], 60 * 4);
    }
    // morning summary, Sun–Thu 08:30
    if (["Sun", "Mon", "Tue", "Wed", "Thu"].includes(il.day) && il.min >= 8 * 60 + 30 && il.min < 9 * 60 + 30) {
      const day = new Date(now).toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
      const startDay = new Date(now - D).toISOString();
      const [{ data: fresh }, { data: open }, { data: calls }, { data: today }, { data: hot }, { data: ending }] = await Promise.all([
        supabase.from("leads").select("id").gte("created_at", startDay).limit(2000),
        supabase.from("leads").select("id").eq("status", "new").limit(2000),
        supabase.from("leads").select("id").not("next_call_at", "is", null).lte("next_call_at", new Date(now + 16 * H).toISOString()).in("status", ["callback", "no_answer"]).limit(2000),
        supabase.from("leads").select("full_name, meeting_at").eq("status", "scheduled").gte("meeting_at", new Date(now).toISOString()).lte("meeting_at", new Date(now + 15 * H).toISOString()).limit(200),
        supabase.from("lead_activities").select("lead_id").eq("kind", "note").like("body", "ענה בוואטסאפ%").gte("created_at", startDay).limit(500),
        supabase.from("users").select("id").neq("plan", "paid").gte("access_until", new Date(now).toISOString()).lte("access_until", new Date(now + 7 * D).toISOString()).limit(5000),
      ]);
      await alert(`dp2_morning:${day}`, `סיכום בוקר ${day}`, [
        `לידים חדשים מאתמול: ${fresh?.length ?? 0}`,
        `לידים שעדיין לא טופלו: ${open?.length ?? 0}`,
        `לחזור היום: ${calls?.length ?? 0}`,
        `פגישות היום: ${today?.length ?? 0}${today?.length ? ` (${today.map((m) => `${m.full_name} ${meetingWhen(m.meeting_at!).split("בשעה ")[1]}`).join(", ")})` : ""}`,
        `ענו בוואטסאפ ומחכים לנציג: ${new Set((hot ?? []).map((h) => h.lead_id)).size}`,
        `ניסיונות שנגמרים השבוע: ${ending?.length ?? 0}`,
        "",
        ...(await funnel(supabase, now)),
      ], 60 * 20);
    }
  }
  // checkup 2027 nurture (non-members who finished the checkup)
  try { out.checkup = await checkupNurtureTick(dry); } catch (e) { out.checkup = { error: (e as Error).message }; }
  return Response.json({ ok: true, dry, ...out });
}

/** Nir's monthly funnel (23.11): 300 signups, 30% ask for the 15-minute call, 15–20% of calls buy, 30 strategy meetings. */
async function funnel(supabase: ReturnType<typeof db>, now: number) {
  const il = new Date(now).toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
  const monthStart = new Date(`${il.slice(0, 7)}-01T00:00:00+02:00`).toISOString();
  const day = Number(il.slice(8, 10));
  const [{ count: signups }, { data: asked }, { count: held }, { count: sales }, { count: strategy }] = await Promise.all([
    supabase.from("users").select("id", { count: "exact", head: true }).gte("created_at", monthStart),
    supabase.from("lead_activities").select("lead_id").eq("kind", "note").or('body.like."ענה בוואטסאפ*",body.like."בחר מועד באתר*"').gte("created_at", monthStart).limit(5000),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("meeting_type", "onboarding").in("status", ["met", "sold"]).gte("updated_at", monthStart),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "paid").gte("paid_at", monthStart),
    supabase.from("leads").select("id", { count: "exact", head: true }).in("meeting_type", ["advisor", "nir"]).gte("created_at", monthStart),
  ]);
  const n = signups ?? 0;
  const a = new Set((asked ?? []).map((x) => x.lead_id)).size;
  const pct = (x: number, of: number) => (of ? `${Math.round((100 * x) / of)}%` : "0%");
  return [
    "משפך החודש (יעדי ניר):",
    `נרשמו: ${n} מתוך 300 (${(n / Math.max(1, day)).toFixed(1)} ביום, יעד 10)`,
    `ביקשו שיחה: ${a} (${pct(a, n)}, יעד 30%)`,
    `שיחות שהתקיימו: ${held ?? 0}`,
    `רכישות: ${sales ?? 0} (${pct(sales ?? 0, held ?? 0)} מהשיחות, יעד 15–20%)`,
    `פגישות אסטרטגיה: ${strategy ?? 0} מתוך 30`,
  ];
}
