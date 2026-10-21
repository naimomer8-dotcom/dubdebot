import { db } from "./supabase";

/** True when this member still has to approve the marketing consent (shown the consent gate). */
export async function consentPending(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  const { data } = await db().from("users").select("marketing_consent").eq("id", userId).maybeSingle();
  return !!data && data.marketing_consent !== true;
}
