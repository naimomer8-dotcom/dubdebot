import { db } from "@/lib/supabase";

/** Open webinar with Nir: every 14 days from Monday 30.11.2026, 20:30 Israel time. */
export const WEBINAR_FIRST = "2026-11-30";
export const WEBINAR_EVERY_DAYS = 14;
export const WEBINAR_TIME = "20:30";

const DAY = 86400_000;
const ilDate = (t: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date(t)); // YYYY-MM-DD

/** Webinar dates (YYYY-MM-DD) from the first one, `count` of them. */
export function webinarDates(count = 26): string[] {
  const start = Date.parse(WEBINAR_FIRST + "T12:00:00Z");
  return Array.from({ length: count }, (_, i) => ilDate(start + i * WEBINAR_EVERY_DAYS * DAY));
}

/** The next webinar on or after today (Israel date). */
export function nextWebinar(now = Date.now()): string {
  const today = ilDate(now);
  const start = Date.parse(WEBINAR_FIRST + "T12:00:00Z");
  const t = Date.parse(today + "T12:00:00Z");
  if (t <= start) return WEBINAR_FIRST;
  const n = Math.ceil((t - start) / (WEBINAR_EVERY_DAYS * DAY));
  return ilDate(start + n * WEBINAR_EVERY_DAYS * DAY);
}

/** "eve" the day before a webinar, "day" on the day itself, otherwise null. */
export function webinarMoment(now = Date.now()): { kind: "eve" | "day"; date: string } | null {
  const today = ilDate(now);
  const next = nextWebinar(now);
  if (next === today) return { kind: "day", date: next };
  if (ilDate(Date.parse(next + "T12:00:00Z") - DAY) === today) return { kind: "eve", date: next };
  return null;
}

/** 30.11 style label */
export const webinarLabel = (d: string) => { const [, m, day] = d.split("-"); return `${Number(day)}.${Number(m)}`; };

/** Registration/entry links per date, kept in app_settings "webinar_links" as { "2026-11-30": "https://..." }. */
export async function webinarLinks(): Promise<Record<string, string>> {
  const { data } = await db().from("app_settings").select("value").eq("key", "webinar_links").maybeSingle();
  return (data?.value as Record<string, string>) ?? {};
}
