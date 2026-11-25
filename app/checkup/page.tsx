import type { Metadata } from "next";
import ConsentGate from "@/components/ConsentGate";
import CheckupClient from "@/components/CheckupClient";
import { consentPending } from "@/lib/consent";
import { getSessionUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "כמה העסק שלך מוכן ל-2027? צ׳קאפ עסקי במתנה | ניר דובדבני",
  description: "24 שאלות שניר דובדבני שואל כשהוא נכנס לעסק. ציון מ-1 עד 10 לכל פרמטר, משוב, ותוכנית עסקית מפורטת ל-2027 שנבנית לעסק שלך. במתנה.",
  openGraph: { title: "כמה העסק שלך מוכן ל-2027?", description: "צ׳קאפ עסקי + תוכנית עסקית ל-2027 מניר דובדבני. במתנה.", locale: "he_IL" },
};

export default async function CheckupPage({ searchParams }: { searchParams: Promise<{ src?: string }> }) {
  const { src } = await searchParams;
  const userId = await getSessionUserId();
  if (await consentPending(userId)) return <ConsentGate />;
  return <CheckupClient loggedIn={!!userId} source={(src ?? (userId ? "app" : "web")).replace(/[^a-z0-9_-]/gi, "").slice(0, 30)} />;
}
