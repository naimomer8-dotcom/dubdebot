import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CheckupReport from "@/components/CheckupReport";
import { getAdmin } from "@/lib/adminAuth";
import { getSessionUserId } from "@/lib/session";
import { benchmark, loadCheckup } from "@/lib/checkupData";
import type { Profile, Report, Scores } from "@/lib/checkup";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "התוכנית העסקית שלך ל-2027 | ניר דובדבני", robots: { index: false } };

export default async function CheckupResult({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const d = await loadCheckup(token);
  if (!d) notFound();
  const [userId, admin, bench] = await Promise.all([getSessionUserId(), getAdmin(), benchmark(((d.profile ?? {}) as Profile).field)]);
  return (
    <CheckupReport
      token={token}
      name={d.name}
      profile={(d.profile ?? {}) as Profile}
      answers={(d.answers ?? {}) as Record<string, number>}
      scores={d.scores as Scores}
      total={Number(d.total)}
      report={d.report as Report}
      finishedAt={d.finished_at as string}
      viewer={admin && d.user_id !== userId ? "admin" : "owner"}
      loggedIn={!!userId}
      bench={bench}
    />
  );
}
