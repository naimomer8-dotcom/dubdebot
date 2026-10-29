import { db } from "@/lib/supabase";
import { getAdmin, json } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Start of "today" in Israel time, as an ISO string. */
function israelMidnightIso(now = new Date()) {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  // offset of Asia/Jerusalem at this moment (+02:00 / +03:00)
  const tz = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jerusalem", timeZoneName: "longOffset" }).formatToParts(now).find((p) => p.type === "timeZoneName")?.value ?? "GMT+02:00";
  const off = tz.replace("GMT", "") || "+00:00";
  return new Date(`${ymd}T00:00:00${off}`).toISOString();
}

/** Back-office live counter: lightweight counts for the launch ticker. */
export async function GET() {
  const admin = await getAdmin();
  if (!admin) return json({ error: "unauthorized" }, 401);
  const supabase = db();
  const now = Date.now();
  const since = (ms: number) => new Date(now - ms).toISOString();
  const count = (q: PromiseLike<{ count: number | null }>) => Promise.resolve(q).then((r) => r.count ?? 0).catch(() => 0);
  const [total, today, lastHour, active15, latest] = await Promise.all([
    count(supabase.from("users").select("id", { count: "exact", head: true })),
    count(supabase.from("users").select("id", { count: "exact", head: true }).gte("created_at", israelMidnightIso())),
    count(supabase.from("users").select("id", { count: "exact", head: true }).gte("created_at", since(3600_000))),
    supabase.from("conversations").select("user_id").gte("updated_at", since(15 * 60_000)).limit(5000)
      .then((r) => new Set((r.data ?? []).map((c) => c.user_id)).size, () => 0),
    supabase.from("users").select("full_name, created_at").order("created_at", { ascending: false }).limit(6)
      .then((r) => r.data ?? [], () => []),
  ]);
  return json({
    total,
    today,
    lastHour,
    active15,
    latest: (latest as { full_name: string | null; created_at: string }[]).map((u) => ({ name: (u.full_name ?? "").trim().split(/\s+/)[0] || "משתמש חדש", at: u.created_at })),
    at: new Date(now).toISOString(),
  });
}
