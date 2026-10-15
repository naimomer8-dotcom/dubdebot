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

export const WEBINAR_ENDS = "22:15"; // after this, "next" already means the following webinar

const ilTime = (t: number) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(t)); // HH:MM

/**
 * The next webinar still ahead (Israel time). Once tonight's webinar is over, it rolls to the following one,
 * so a page or link opened after 30.11 at 22:15 already shows 14.12.
 */
export function nextWebinar(now = Date.now()): string {
  const d = nextWebinarDate(now);
  if (d === ilDate(now) && ilTime(now) >= WEBINAR_ENDS) return ilDate(Date.parse(d + "T12:00:00Z") + WEBINAR_EVERY_DAYS * DAY);
  return d;
}

/** The next webinar on or after today, by date only (used for the reminder schedule). */
function nextWebinarDate(now: number): string {
  const today = ilDate(now);
  const start = Date.parse(WEBINAR_FIRST + "T12:00:00Z");
  const t = Date.parse(today + "T12:00:00Z");
  if (t <= start) return WEBINAR_FIRST;
  const n = Math.ceil((t - start) / (WEBINAR_EVERY_DAYS * DAY));
  return ilDate(start + n * WEBINAR_EVERY_DAYS * DAY);
}

/**
 * Where today sits relative to the webinars: a week before ("week"), the day before ("eve"),
 * the day itself ("day") or the day after the last one ("after"). Otherwise null.
 */
export type WebinarKind = "week" | "eve" | "day" | "after";
export function webinarMoment(now = Date.now()): { kind: WebinarKind; date: string; next: string } | null {
  const today = ilDate(now);
  const next = nextWebinarDate(now);
  const at = (d: string, days: number) => ilDate(Date.parse(d + "T12:00:00Z") + days * DAY);
  const following = at(next, WEBINAR_EVERY_DAYS);
  if (next === today) return { kind: "day", date: next, next: following };
  if (at(next, -1) === today) return { kind: "eve", date: next, next };
  if (at(next, -7) === today) return { kind: "week", date: next, next };
  const prev = at(next, -WEBINAR_EVERY_DAYS);
  if (Date.parse(prev + "T12:00:00Z") >= Date.parse(WEBINAR_FIRST + "T12:00:00Z") && at(prev, 1) === today) return { kind: "after", date: prev, next };
  return null;
}

/** 30.11 style label */
export const webinarLabel = (d: string) => { const [, m, day] = d.split("-"); return `${Number(day)}.${Number(m)}`; };
