import { db } from "./supabase";
import type { Offers } from "./plans";

const H = 3600_000;

/**
 * The real, time-limited offers the journey messages promise. The deadline in every message is
 * enforced here, so the FOMO is true: after the date, the regular price comes back.
 * - privateHalf: in the gift month (not paid yet) → Alpha Private add-on ₪295 instead of ₪590, until access ends
 * - installmentsAtOnetime: 72h after the "l_d33_rep" win-back message → 12 installments at ₪229 instead of ₪299
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
  if (send?.sent_at) {
    const end = new Date(send.sent_at).getTime() + 72 * H;
    if (end > now) out.installmentsAtOnetime = new Date(end).toISOString();
  }
  return out;
}
