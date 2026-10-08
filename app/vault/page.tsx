import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUserId } from "@/lib/session";
import { db } from "@/lib/supabase";
import { loadShell } from "@/lib/data";
import ExpiredScreen from "@/components/ExpiredScreen";
import VaultClient from "@/components/VaultClient";
import type { Scores } from "@/lib/xray";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "התיק העסקי שלי | דובדבוט" };

export default async function VaultPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");
  const shell = await loadShell(userId);
  if (!shell) redirect("/");
  if (shell.user.access.status === "expired") return <ExpiredScreen user={shell.user} />;
  const supabase = db();
  const [{ data: u }, { data: xr }, { data: deliverables }, { data: tasks }] = await Promise.all([
    supabase.from("users").select("profile").eq("id", userId).single(),
    supabase.from("xray_results").select("id, scores, total, archetype, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(6),
    supabase.from("deliverables").select("id, kind, title, content, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
    supabase.from("tasks").select("id, text, priority, done, deliverable_id, position, created_at").eq("user_id", userId).order("done").order("position").limit(200),
  ]);

  return (
    <VaultClient
      user={shell.user}
      conversations={shell.conversations}
      leadSent={shell.leadSent}
      profile={(u?.profile as Record<string, unknown>) ?? {}}
      xrays={(xr ?? []).map((x) => ({ ...x, scores: x.scores as Scores }))}
      deliverables={deliverables ?? []}
      tasks={tasks ?? []}
    />
  );
}
