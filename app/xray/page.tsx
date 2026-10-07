import type { Metadata } from "next";
import { getSessionUserId } from "@/lib/session";
import XrayClient from "@/components/XrayClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "רנטגן עסקי ב-3 דקות | דובדבוט",
  description: "12 שאלות שניר דובדבני שואל בפגישה הראשונה. ציון על שישה צירים, פרופיל עסקי וצוואר הבקבוק הכי מסוכן בעסק שלך.",
  openGraph: { title: "רנטגן עסקי ב-3 דקות – דובדבוט", description: "איפה העסק שלך דולף כסף? 12 שאלות, ציון, ופרופיל.", locale: "he_IL" },
};

export default async function XrayPage() {
  const userId = await getSessionUserId();
  return <XrayClient loggedIn={!!userId} />;
}
