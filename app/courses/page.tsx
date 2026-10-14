import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUserId } from "@/lib/session";
import { db } from "@/lib/supabase";
import { loadShell } from "@/lib/data";
import ExpiredScreen from "@/components/ExpiredScreen";
import CoursesClient from "@/components/CoursesClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "הקורסים שלי | דובדבוט" };

export default async function CoursesPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");
  const shell = await loadShell(userId);
  if (!shell) redirect("/");
  if (shell.user.access.status === "expired") return <ExpiredScreen user={shell.user} />;
  const { data: u } = await db().from("users").select("course_links").eq("id", userId).single();
  return <CoursesClient user={shell.user} conversations={shell.conversations} leadSent={shell.leadSent} links={(u?.course_links as Record<string, string>) ?? {}} />;
}
