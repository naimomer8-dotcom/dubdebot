import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUserId } from "@/lib/session";
import { loadShell } from "@/lib/data";
import ExpiredScreen from "@/components/ExpiredScreen";
import ConsentGate from "@/components/ConsentGate";
import CampaignBuilder from "@/components/CampaignBuilder";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "בונים קמפיין מאפס | Duvdevani Platform" };

export default async function CampaignPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");
  const shell = await loadShell(userId);
  if (!shell) redirect("/");
  if (!shell.user.consent) return <ConsentGate firstName={shell.user.firstName} />;
  if (shell.user.access.status === "expired") return <ExpiredScreen user={shell.user} />;
  return <CampaignBuilder user={shell.user} conversations={shell.conversations} />;
}
