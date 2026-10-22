import { hasCurrentConsent } from "@/lib/legal";
import { db } from "./supabase";

/** True when this member still has to approve the marketing consent (shown the consent gate). */
export async function consentPending(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  const { data } = await db().from("users").select("marketing_consent, marketing_consent_text_version").eq("id", userId).maybeSingle();
  return !!data && !hasCurrentConsent(data);
}
