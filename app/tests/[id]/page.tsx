import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { loadShell } from "@/lib/data";
import ExpiredScreen from "@/components/ExpiredScreen";
import QuizClient from "@/components/QuizClient";
import { QUIZZES, type QuizId } from "@/lib/quizzes";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "מבחנים | דובדבוט" };

export default async function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(id in QUIZZES)) notFound();
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  const shell = await loadShell(userId);
  if (!shell) redirect("/login");
  if (shell.user.access.status === "expired") return <ExpiredScreen user={shell.user} />;
  return <QuizClient id={id as QuizId} />;
}
