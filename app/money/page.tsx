import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUserId } from "@/lib/session";
import { db } from "@/lib/supabase";
import { loadShell } from "@/lib/data";
import { moneyFromProfile } from "@/lib/money";
import ExpiredScreen from "@/components/ExpiredScreen";
import MoneyClient from "@/components/MoneyClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "כסף | Duvdevani Platform" };

export default async function MoneyPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");
  const shell = await loadShell(userId);
  if (!shell) redirect("/");
  if (shell.user.access.status === "expired") return <ExpiredScreen user={shell.user} />;
  const { data: u } = await db().from("users").select("profile").eq("id", userId).single();
  return <MoneyClient user={shell.user} conversations={shell.conversations} leadSent={shell.leadSent} initial={moneyFromProfile(u?.profile as Record<string, unknown>)} />;
}
