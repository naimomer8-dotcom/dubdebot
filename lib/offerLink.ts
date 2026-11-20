import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

/**
 * Shareable "12 installments at the one-time price" link (/o).
 * The first click opens a 72-hour window in that browser (signed cookie); clicking again does not extend it,
 * so the deadline is real. While it is open, priceOf() gives installments at the one-time price on every tier.
 */
export const OFFER_COOKIE = "dd_o12";
export const OFFER_HOURS = 72;

function key() {
  return process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dd-o12";
}
const sig = (until: string) => createHmac("sha256", key()).update(`o12:${until}`).digest("base64url").slice(0, 24);
export const offerCookieValue = (until: string) => `${until}.${sig(until)}`;

/** The offer window held in this browser, if still open (ISO end). */
export async function offerFromCookie(now = Date.now()): Promise<string | null> {
  try {
    const raw = (await cookies()).get(OFFER_COOKIE)?.value;
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
