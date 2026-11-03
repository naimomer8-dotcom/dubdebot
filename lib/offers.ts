import { db } from "./supabase";
import type { Offers } from "./plans";
import { referrerOf } from "./referral";
import { giftFromCookie } from "./webinarGift";

const H = 3600_000;

/**
 * The real, time-limited offers the journey messages promise. The deadline in every message is
 * enforced here, so the FOMO is true: after the date, the regular price comes back.
 * - privateHalf: in the gift month (not paid yet) → Platform Private add-on ₪295 instead of ₪590, until access ends
 * - installmentsAtOnetime: 72h after the "l_d33_rep" win-back message → 12 installments at ₪229 instead of ₪299
 * - friendHalf: signed up through a member's personal link → 50% off the first annual subscription
 * - webinarHalf: stayed to the end of the live webinar (gift QR on the last slide) → Platform Private at 50%, until Tuesday 23:59 after it
 */
export async function offersFor(userId: string): Promise<Offers> {
  const supabase = db();
  const [{ data: u }, { data: send }] = await Promise.all([
    supabase.from("users").select("plan, access_until").eq("id", userId).maybeSingle(),
    supabase.from("journey_sends").select("sent_at").eq("user_id", userId).eq("stage", "l_d33_rep").maybeSingle(),
  ]);
  const out: Offers = {};
  if (!u || u.plan === "paid") return out;
  const now = Date.now();
  if (u.access_until && new Date(u.access_until).getTime() > now) out.privateHalf = u.access_until;
  if (await referrerOf(userId).catch(() => null)) out.friendHalf = "first-year";
  const gift = await webinarGiftFor(userId, now);
  if (gift) out.webinarHalf = gift;
  if (send?.sent_at) {
    const end = new Date(send.sent_at).getTime() + 72 * H;
    if (end > now) out.installmentsAtOnetime = new Date(end).toISOString();
  }
  return out;
}

/** The webinar gift held by this browser (cookie) or saved on the account (scanned while signed in). */
export async function webinarGiftFor(userId: string | null, now = Date.now()): Promise<string | null> {
  const fromCookie = await giftFromCookie(now);
  if (fromCookie || !userId) return fromCookie;
  const { data } = await db().from("events").select("meta").eq("user_id", userId).eq("type", "webinar_gift").order("created_at", { ascending: false }).limit(1).maybeSingle();
  const until = (data?.meta as { until?: string } | null)?.until;
  return until && Date.parse(until) > now ? until : null;
}
