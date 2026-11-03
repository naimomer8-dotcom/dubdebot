import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUserId } from "@/lib/session";
import { loadShell } from "@/lib/data";
import { homeState, quoteOfDay } from "@/lib/home";
import { nextWebinar } from "@/lib/webinarDates";
import ExpiredScreen from "@/components/ExpiredScreen";
import ConsentGate from "@/components/ConsentGate";
import HomeClient from "@/components/HomeClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "הבוקר שלך עם ניר | Duvdevani Platform" };

export default async function HomePage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");
  const shell = await loadShell(userId);
  if (!shell) redirect("/");
  if (!shell.user.consent) return <ConsentGate firstName={shell.user.firstName} />;
  if (shell.user.access.status === "expired") return <ExpiredScreen user={shell.user} />;
  const { steps, xrayScore } = await homeState(userId);
  return <HomeClient user={shell.user} conversations={shell.conversations} steps={steps} xrayScore={xrayScore} quote={quoteOfDay()} webinarDate={nextWebinar()} />;
}
