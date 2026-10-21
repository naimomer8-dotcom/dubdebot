import type { Metadata } from "next";
import ConsentGate from "@/components/ConsentGate";
import { consentPending } from "@/lib/consent";
import { getSessionUserId } from "@/lib/session";
import XrayClient from "@/components/XrayClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "רנטגן עסקי ב-3 דקות | Duvdevani Platform",
  description: "12 שאלות שניר דובדבני שואל בפגישה הראשונה. ציון על שישה צירים, פרופיל עסקי וצוואר הבקבוק הכי מסוכן בעסק שלך.",
  openGraph: { title: "רנטגן עסקי ב-3 דקות – Duvdevani Platform", description: "איפה העסק שלך דולף כסף? 12 שאלות, ציון, ופרופיל.", locale: "he_IL" },
};

export default async function XrayPage() {
  const userId = await getSessionUserId();
  if (await consentPending(userId)) return <ConsentGate />;
  return <XrayClient loggedIn={!!userId} />;
}
