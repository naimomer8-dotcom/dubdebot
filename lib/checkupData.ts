import { db } from "@/lib/supabase";

/** A finished checkup by its private token (the link sent to the person and shown to the rep). */
export async function loadCheckup(token: string) {
  if (!/^[a-zA-Z0-9_-]{16,40}$/.test(token)) return null;
  const { data } = await db().from("checkup_results").select("id, user_id, full_name, profile, answers, scores, total, report, finished_at").eq("token", token).eq("status", "done").maybeSingle();
  if (!data?.report) return null;
  let name = (data.full_name as string) ?? "";
  if (!name && data.user_id) {
    const { data: u } = await db().from("users").select("full_name").eq("id", data.user_id).maybeSingle();
    name = (u?.full_name as string) ?? "";
  }
  return { ...data, name: name.split(" ")[0] };
}

