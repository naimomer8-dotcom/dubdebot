/** Live webinar with Nir ("מנועי צמיחה לעסק שלך לשנת 2027"): every 14 days from Sunday 15.11.2026, 21:00 Israel time. */
export const WEBINAR_FIRST = "2026-11-15";
export const WEBINAR_EVERY_DAYS = 14;
export const WEBINAR_TIME = "21:00";
export const WEBINAR_DAY = "יום ראשון";
export const WEBINAR_TITLE = "מנועי צמיחה לעסק שלך לשנת 2027";
/** One recurring Zoom webinar (Evyatar's account, Nir as panelist): the same link for every date. */
export const WEBINAR_ZOOM_URL = "https://us06web.zoom.us/j/89252241486?pwd=aw4X5I1bshc4DvNKuhYY1GC3gEnSLv.1";
/** Quiet WhatsApp group for webinar updates. */
export const WEBINAR_WA_GROUP = "https://chat.whatsapp.com/Bq0CfCyS9uI6g3lFS57eKX";

const DAY = 86400_000;
const ilDate = (t: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date(t)); // YYYY-MM-DD

/** Webinar dates (YYYY-MM-DD) from the first one, `count` of them. */
export function webinarDates(count = 26): string[] {
  const start = Date.parse(WEBINAR_FIRST + "T12:00:00Z");
  return Array.from({ length: count }, (_, i) => ilDate(start + i * WEBINAR_EVERY_DAYS * DAY));
}

export const WEBINAR_ENDS = "22:45"; // after this, "next" already means the following webinar

const ilTime = (t: number) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(t)); // HH:MM

/**
 * The next webinar still ahead (Israel time). Once tonight's webinar is over, it rolls to the following one,
 * so a page or link opened after 15.11 at 22:45 already shows 29.11.
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
 * Where today sits relative to the webinars: a week before ("week"), Friday before ("eve": the day before is Shabbat, so the reminder goes out Friday morning),
 * the day itself ("day") or the day after the last one ("after"). Otherwise null.
 */
export type WebinarKind = "week" | "eve" | "day" | "after";
export function webinarMoment(now = Date.now()): { kind: WebinarKind; date: string; next: string } | null {
  const today = ilDate(now);
  const next = nextWebinarDate(now);
  const at = (d: string, days: number) => ilDate(Date.parse(d + "T12:00:00Z") + days * DAY);
  const following = at(next, WEBINAR_EVERY_DAYS);
  if (next === today) return { kind: "day", date: next, next: following };
  if (at(next, -2) === today) return { kind: "eve", date: next, next }; // Friday morning (Shabbat is skipped)
  if (at(next, -7) === today) return { kind: "week", date: next, next };
  const prev = at(next, -WEBINAR_EVERY_DAYS);
  if (Date.parse(prev + "T12:00:00Z") >= Date.parse(WEBINAR_FIRST + "T12:00:00Z") && at(prev, 1) === today) return { kind: "after", date: prev, next };
  return null;
}

/** 15.11 style label */
export const webinarLabel = (d: string) => { const [, m, day] = d.split("-"); return `${Number(day)}.${Number(m)}`; };
