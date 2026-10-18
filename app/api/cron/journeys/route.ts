import { db } from "@/lib/supabase";
import { emit } from "@/lib/automation";
import { dueStage, emailParts, render, type JourneyUser } from "@/lib/journeys";
import { PLANS } from "@/lib/plans";
import { refLink } from "@/lib/referral";
import { alert } from "@/lib/alerts";
import { TOOLS } from "@/lib/persona";
import { webinarMoment, nextWebinar, webinarLabel, webinarLinks, WEBINAR_TIME, WEBINAR_WA_GROUP } from "@/lib/webinars";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Daily journey run (Vercel Cron, 09:00 Israel). For every person it picks the one stage due today,
 * records it (each stage once per person) and pushes it to Make → ManyChat WhatsApp + email.
 * Skips Shabbat. Protected by CRON_SECRET (Vercel sends it as a Bearer token).
 * ?dry=1 returns what would be sent without sending.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("unauthorized", { status: 401 });
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  if (!dry && !process.env.MAKE_EVENTS_WEBHOOK_URL) return Response.json({ error: "MAKE_EVENTS_WEBHOOK_URL not set – nothing sent" }, { status: 503 });

  const il = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jerusalem", weekday: "short" }).format(new Date());
  if (il === "Sat" && !dry) return Response.json({ skipped: "shabbat" });

  const supabase = db();
  const since = new Date(Date.now() - 400 * 86400_000).toISOString();
  const [{ data: users }, { data: fin }, { data: sends }] = await Promise.all([
    supabase.from("users").select("id, plan, created_at, access_until, subscribed_at, year_ends_at, renewal_mode, questions_count, marketing_opt_out, marketing_consent").or(`created_at.gte.${since},plan.eq.paid`).limit(20000),
    supabase.from("financials").select("user_id").limit(50000),
    supabase.from("journey_sends").select("user_id, stage").limit(200000),
  ]);
  const hasFin = new Set((fin ?? []).map((f) => f.user_id));
  const sent = new Map<string, Set<string>>();
  for (const s of sends ?? []) {
    const set = sent.get(s.user_id) ?? new Set<string>();
    set.add(s.stage);
    sent.set(s.user_id, set);
  }

  const app = process.env.PUBLIC_APP_URL || "https://dubdebot.vercel.app";
  const due: { userId: string; stage: string }[] = [];
  // the day before and the day of each webinar, non-members get the webinar message instead of the regular stage
  const wm = webinarMoment();
  for (const u of (users ?? []) as (Omit<JourneyUser, "has_financials"> & { marketing_consent: boolean | null })[]) {
    // Israeli anti-spam law: marketing only with consent; transactional notices go to everyone
    const optOut = u.marketing_opt_out || !u.marketing_consent;
    // members get the week-before and the day itself; everyone else the full sequence
    if (wm && !optOut && (u.plan !== "paid" || wm.kind === "week" || wm.kind === "day")) {
      const key = `${u.plan === "paid" ? "wm" : "w"}_${wm.kind}:${wm.date}`;
      if (!sent.get(u.id)?.has(key)) { due.push({ userId: u.id, stage: key }); continue; }
    }
    const s = dueStage({ ...u, marketing_opt_out: optOut, has_financials: hasFin.has(u.id) }, sent.get(u.id) ?? new Set());
    if (s) due.push({ userId: u.id, stage: s.key });
  }
  // abandoned checkouts: a pending order older than an hour, nothing paid since
  const { data: pending } = await supabase.from("orders").select("id, user_id, created_at, tier").eq("status", "pending").lt("created_at", new Date(Date.now() - 3600_000).toISOString()).gt("created_at", new Date(Date.now() - 7 * 86400_000).toISOString()).limit(2000);
  for (const o of pending ?? []) {
    const key = `c_abandon:${o.id}`;
    if (!(sent.get(o.user_id)?.has(key))) {
      due.push({ userId: o.user_id, stage: key });
      // the sales team gets a heads-up too (Nadav: "אם הוא עצר באמצע, נדב יקבל הקפצה")
      if (!dry) {
        const { data: who } = await supabase.from("users").select("full_name, phone, email").eq("id", o.user_id).single();
        const plan = PLANS.find((p) => p.id === o.tier)?.name ?? String(o.tier ?? "");
        await alert(`abandon:${o.id}`, `עצר באמצע תשלום: ${plan}`, [`${who?.full_name ?? ""} · ${who?.phone ?? ""} · ${who?.email ?? ""}`, `התחיל לשלם על ${plan} ולא סיים. שווה שיחה היום.`], 60 * 24 * 30);
      }
    }
  }
  if (dry) return Response.json({ dry: true, count: due.length, sample: due.slice(0, 50) });

  const wDate = wm && wm.kind !== "after" ? wm.date : nextWebinar();
  const wLink = (await webinarLinks().catch(() => ({} as Record<string, string>)))[wDate];
  const toolName = (mode: string) => (mode === "chat" ? "שיחות איתי" : TOOLS.find((t) => t.id === mode)?.title ?? "שיחות איתי");
  let ok = 0;
  const { STAGES } = await import("@/lib/journeys");
  const queue = due.slice(0, 2000);
  const worker = async () => {
    for (let job = queue.shift(); job; job = queue.shift()) {
      const st = STAGES.find((x) => x.key === job.stage.split(":")[0])!;
      // claim first (unique user+stage) so a retry never double-sends
      const { error } = await supabase.from("journey_sends").insert({ user_id: job.userId, stage: job.stage });
      if (error) continue;
      const { data: u } = await supabase.from("users").select("full_name, year_ends_at, access_until").eq("id", job.userId).single();
      const date = (d: string | number | null | undefined) => (d ? new Date(d).toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem", day: "numeric", month: "numeric" }) : "");
      const left = u?.access_until ? Math.max(0, Math.ceil((new Date(u.access_until).getTime() - Date.now()) / 86400_000)) : 0;
      let planName = "המסלול";
      if (st.key === "c_abandon") {
        const { data: o } = await supabase.from("orders").select("tier").eq("id", job.stage.split(":")[1]).maybeSingle();
        planName = PLANS.find((p) => p.id === o?.tier)?.name ?? planName;
      }
      const vars = {
        first_name: String(u?.full_name ?? "").split(" ")[0],
        app_url: app,
        plans_url: `${app}/plans`,
        year_end: date(u?.year_ends_at),
        trial_end: date(u?.access_until),
        days_left: String(left),
        offer_end: date(Date.now() + 72 * 3600_000),
        return_end: date(u?.year_ends_at ? new Date(u.year_ends_at).getTime() + 30 * 86400_000 : null),
        plan_name: planName,
        ref_link: refLink(job.userId, app),
        webinar: webinarLabel(wDate),
        webinar_time: WEBINAR_TIME,
        webinar_next: webinarLabel(wm?.next ?? nextWebinar()),
        webinar_url: wLink || `${app}/w`,
        wa_group: WEBINAR_WA_GROUP,
        top_tool: "",
      };
      if (st.text.includes("{{top_tool}}")) {
        const { data: convs } = await supabase.from("conversations").select("mode").eq("user_id", job.userId).limit(200);
        const count = new Map<string, number>();
        for (const c of convs ?? []) count.set(c.mode, (count.get(c.mode) ?? 0) + 1);
        const top = [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "chat";
        vars.top_tool = toolName(top);
      }
      const text = render(st.text, vars);
      const r = await emit("journey", job.userId, { stage: job.stage, track: st.track, whatsapp_template: st.wa, email_subject: render(st.subject, vars), text, email_parts: emailParts(text), vars, transactional: !!st.transactional });
      if (r.sent) ok++;
      else await supabase.from("journey_sends").update({ ok: false }).eq("user_id", job.userId).eq("stage", job.stage);
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  return Response.json({ due: due.length, sent: ok });
}
