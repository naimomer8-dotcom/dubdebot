import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { webinarDates, WEBINAR_TIME } from "./webinarDates";

/**
 * "Stay to the end" gift of the live webinar: Platform Private at 50% off.
 * The QR is shown only on the last slide. The link works from the start of a webinar (21:00)
 * until Tuesday 23:59 after it, then the regular price comes back. So the deadline Nir says is real.
 */
export const GIFT_CODE = "stay";
export const GIFT_COOKIE = "dd_gift";
export const GIFT_DISCOUNT = 0.5;
const DAY = 86400_000;

/** Israel UTC offset (e.g. "+02:00") on a given date, DST-aware. */
function ilOffset(date: string) {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jerusalem", timeZoneName: "shortOffset" }).formatToParts(new Date(date + "T12:00:00Z")).find((p) => p.type === "timeZoneName")?.value ?? "GMT+2";
  const m = name.match(/GMT([+-])(\d+)/);
  return m ? `${m[1]}${m[2].padStart(2, "0")}:00` : "+02:00";
}

/** If a webinar gift window is open right now, its end (ISO). Otherwise null. */
export function giftWindow(now = Date.now()): string | null {
  for (const d of webinarDates()) {
    const start = Date.parse(`${d}T${WEBINAR_TIME}:00${ilOffset(d)}`);
    const endDay = new Date(Date.parse(d + "T12:00:00Z") + 2 * DAY).toISOString().slice(0, 10);
    const end = Date.parse(`${endDay}T23:59:59${ilOffset(endDay)}`);
    if (now >= start && now <= end) return new Date(end).toISOString();
    if (start > now) break;
  }
  return null;
}

function key() {
  return process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dd-gift";
}
const sig = (until: string) => createHmac("sha256", key()).update(`gift:${until}`).digest("base64url").slice(0, 24);

export const giftCookieValue = (until: string) => `${until}.${sig(until)}`;

/** The gift held in this browser (signed cookie), if still valid. */
export async function giftFromCookie(now = Date.now()): Promise<string | null> {
  try {
    const raw = (await cookies()).get(GIFT_COOKIE)?.value;
    if (!raw) return null;
    const i = raw.lastIndexOf(".");
    const until = raw.slice(0, i);
    const a = Buffer.from(raw.slice(i + 1));
    const b = Buffer.from(sig(until));
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return Date.parse(until) > now ? until : null;
  } catch {
    return null;
  }
}
