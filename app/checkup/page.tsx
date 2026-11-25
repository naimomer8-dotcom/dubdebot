import type { Metadata } from "next";
import ConsentGate from "@/components/ConsentGate";
import CheckupClient from "@/components/CheckupClient";
import { consentPending } from "@/lib/consent";
import { getSessionUserId } from "@/lib/session";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "צ׳קאפ עסקי + תוכנית עסקית ל-2027, במתנה | ניר דובדבני",
  description: "24 שאלות שניר דובדבני שואל כשהוא נכנס לעסק. ציון מ-1 עד 10 לכל פרמטר, משוב, ותוכנית עסקית מפורטת ל-2027 שנבנית לעסק שלך.",
  openGraph: { title: "הצ׳קאפ העסקי של ניר דובדבני · 2027", description: "ציון לכל פרמטר, משוב ותוכנית עסקית לשנה הקרובה. במתנה.", locale: "he_IL" },
};

export default async function CheckupPage() {
  const userId = await getSessionUserId();
  if (await consentPending(userId)) return <ConsentGate />;
  let initial = null;
  let doneId: string | null = null;
  if (userId) {
    const { data } = await db().from("checkup_results").select("id, status, step, profile, answers").eq("user_id", userId).order("started_at", { ascending: false }).limit(5);
    const prog = (data ?? []).find((r) => r.status === "in_progress");
    const done = (data ?? []).find((r) => r.status === "done");
    doneId = (done?.id as string) ?? null;
    if (prog) initial = { id: prog.id as string, status: "in_progress", step: prog.step as number, profile: (prog.profile ?? {}) as Record<string, string>, answers: (prog.answers ?? {}) as Record<string, number> };
  }
  return <CheckupClient loggedIn={!!userId} initial={initial} doneId={doneId} />;
}
