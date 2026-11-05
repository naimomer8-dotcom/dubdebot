import { db } from "@/lib/supabase";
import { emit } from "@/lib/automation";
import { BROADCASTS } from "@/lib/broadcasts";
import { emailParts, noAstral, render } from "@/lib/journeys";

export const runtime = "nodejs";
export const maxDuration = 300;

const ilDate = (t = Date.now()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date(t));

/**
 * Daily (Vercel Cron). Sends today's approved broadcast to everyone who agreed to marketing and has an email,
 * once per person (claimed in journey_sends). Never on Friday or Saturday. ?dry=1 counts without sending.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("unauthorized", { status: 401 });
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  const day = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jerusalem", weekday: "short" }).format(new Date());
  if (day === "Fri" || day === "Sat") return Response.json({ skipped: "shabbat" });
  const b = BROADCASTS.find((x) => x.approved && x.date === ilDate());
  if (!b) return Response.json({ skipped: "nothing approved for today" });
  if (!dry && !process.env.MAKE_EVENTS_WEBHOOK_URL) return Response.json({ error: "MAKE_EVENTS_WEBHOOK_URL not set" }, { status: 503 });

  const supabase = db();
  const [{ data: users }, { data: sends }] = await Promise.all([
    supabase.from("users").select("id, full_name, email, marketing_opt_out").eq("marketing_consent", true).not("email", "is", null).limit(20000),
    supabase.from("journey_sends").select("user_id").eq("stage", b.key).limit(20000),
  ]);
  const done = new Set((sends ?? []).map((s) => s.user_id));
  const due = (users ?? []).filter((u) => !u.marketing_opt_out && !done.has(u.id));
  if (dry) return Response.json({ dry: true, broadcast: b.key, count: due.length });

  const app = process.env.PUBLIC_APP_URL || "https://dubdebot.vercel.app";
  let ok = 0;
  const queue = due.slice();
  const worker = async () => {
    for (let u = queue.shift(); u; u = queue.shift()) {
      // claim first (unique user + stage) so a retry never sends twice
      const { error } = await supabase.from("journey_sends").insert({ user_id: u.id, stage: b.key });
      if (error) continue;
      const vars = { first_name: String(u.full_name ?? "").split(" ")[0], plans_url: `${app}${b.link}`, app_url: app };
      const text = render(b.text, vars);
      const r = await emit("journey", u.id, { stage: b.key, track: "broadcast", whatsapp_template: "", email_subject: noAstral(render(b.subject, vars)), text, email_parts: emailParts(text), vars });
      if (r.sent) ok++;
      else await supabase.from("journey_sends").update({ ok: false }).eq("user_id", u.id).eq("stage", b.key);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  return Response.json({ broadcast: b.key, due: due.length, sent: ok });
}
