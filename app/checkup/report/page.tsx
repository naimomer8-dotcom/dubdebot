import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import CheckupReport from "@/components/CheckupReport";
import { getAdmin } from "@/lib/adminAuth";
import { getSessionUserId } from "@/lib/session";
import { db } from "@/lib/supabase";
import type { Profile, Report, Scores } from "@/lib/checkup";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "התוכנית העסקית שלך ל-2027 | ניר דובדבני", robots: { index: false } };

export default async function CheckupReportPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const [userId, admin] = await Promise.all([getSessionUserId(), getAdmin()]);
  if (!userId && !admin) redirect(`/login?next=${encodeURIComponent(`/checkup/report${id ? `?id=${id}` : ""}`)}`);
  const supabase = db();
  let q = supabase.from("checkup_results").select("id, user_id, profile, answers, scores, total, report, finished_at").eq("status", "done");
  if (id && /^[0-9a-f-]{36}$/i.test(id)) q = q.eq("id", id);
  else if (userId) q = q.eq("user_id", userId);
  else notFound();
  const { data } = await q.order("finished_at", { ascending: false }).limit(1).maybeSingle();
  if (!data || !data.report) notFound();
  const isOwner = !!userId && data.user_id === userId;
  if (!isOwner && !admin) notFound();
  const { data: u } = await supabase.from("users").select("full_name").eq("id", data.user_id).maybeSingle();
  return (
    <CheckupReport
      id={data.id as string}
      name={((u?.full_name as string) ?? "").split(" ")[0]}
      profile={(data.profile ?? {}) as Profile}
      answers={(data.answers ?? {}) as Record<string, number>}
      scores={data.scores as Scores}
      total={Number(data.total)}
      report={data.report as Report}
      finishedAt={data.finished_at as string}
      viewer={isOwner ? "owner" : "admin"}
    />
  );
}
