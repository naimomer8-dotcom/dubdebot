import { db } from "./supabase";
import { emit } from "./automation";

/** Friend-brings-friend: every member's personal code is the first 8 chars of their id. */
export const refCode = (userId: string) => userId.replace(/-/g, "").slice(0, 8);
export const refLink = (userId: string, app = process.env.PUBLIC_APP_URL || "https://dubdebot.vercel.app") => `${app}/?ref=${refCode(userId)}`;

/**
 * Called when someone pays for the first time. If they signed up through a friend's link,
 * the friend earns a seat at Nir's quarterly workshop "להעיר את הכסף שבך" (recorded + pushed to Make → WhatsApp/Fireberry).
 */
/** The member whose link this user signed up through (utm.ref), if any. */
export async function referrerOf(userId: string): Promise<string | null> {
  const supabase = db();
  const { data: u } = await supabase.from("users").select("id, utm").eq("id", userId).maybeSingle();
  const code = String((u?.utm as Record<string, unknown> | null)?.ref ?? "").toLowerCase().replace(/[^0-9a-f]/g, "").slice(0, 8);
  if (!u || code.length !== 8) return null;
  const { data: cands } = await supabase.from("users").select("id").gte("id", `${code}-0000-0000-0000-000000000000`).lte("id", `${code}-ffff-ffff-ffff-ffffffffffff`).limit(5);
  return (cands ?? []).find((c) => refCode(c.id) === code && c.id !== userId)?.id ?? null;
}

export async function rewardReferrer(buyerId: string) {
  const supabase = db();
  const { data: buyer } = await supabase.from("users").select("id, full_name, utm").eq("id", buyerId).maybeSingle();
  const code = String((buyer?.utm as Record<string, unknown> | null)?.ref ?? "").toLowerCase().replace(/[^0-9a-f]/g, "").slice(0, 8);
  if (!buyer || code.length !== 8) return null;
  // the code is the first uuid segment, so the referrer sits in a uuid range
  const { data: cands } = await supabase.from("users").select("id").gte("id", `${code}-0000-0000-0000-000000000000`).lte("id", `${code}-ffff-ffff-ffff-ffffffffffff`).limit(5);
  const referrer = (cands ?? []).find((c) => refCode(c.id) === code && c.id !== buyerId);
  if (!referrer) return null;
  await supabase.from("events").insert({ user_id: referrer.id, type: "referral:reward", meta: { friend_id: buyerId, friend_name: buyer.full_name, reward: "sales_workshop" } });
  await emit("referral_reward", referrer.id, { friend_name: buyer.full_name, reward: "sales_workshop" });
  return referrer.id;
}
