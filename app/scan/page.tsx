import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { loadShell } from "@/lib/data";
import ExpiredScreen from "@/components/ExpiredScreen";
import ScanClient from "@/components/ScanClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "סריקת רשתות חברתיות | דובדבוט" };

export default async function ScanPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login?next=scan");
  const shell = await loadShell(userId);
  if (!shell) redirect("/login?next=scan");
  if (shell.user.access.status === "expired") return <ExpiredScreen user={shell.user} />;
  return <ScanClient />;
}
