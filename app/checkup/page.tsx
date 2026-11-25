import type { Metadata } from "next";
import ConsentGate from "@/components/ConsentGate";
import CheckupClient from "@/components/CheckupClient";
import { consentPending } from "@/lib/consent";
import { getSessionUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "כמה אתה והעסק שלך מוכנים ל-2027? צ׳קאפ אישי ועסקי במתנה | ניר דובדבני",
  description: "הצ׳קאפ האישי והעסקי של ניר דובדבני: ציון מ-1 עד 10 לעסק ולחיים שלך (בית, משכנתא, נדל״ן, פרישה), ותוכנית עסקית ואישית ל-2027. במתנה.",
  openGraph: { title: "כמה אתה והעסק שלך מוכנים ל-2027?", description: "צ׳קאפ אישי ועסקי + תוכנית ל-2027 מניר דובדבני. במתנה.", locale: "he_IL" },
};

export default async function CheckupPage({ searchParams }: { searchParams: Promise<{ src?: string; ref?: string }> }) {
  const { src, ref } = await searchParams;
  const userId = await getSessionUserId();
  if (await consentPending(userId)) return <ConsentGate />;
  return <CheckupClient loggedIn={!!userId} source={(src ?? (ref ? `ref-${ref}` : userId ? "app" : "web")).replace(/[^a-z0-9_-]/gi, "").slice(0, 40)} />;
}
