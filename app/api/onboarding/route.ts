import { db } from "@/lib/supabase";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The signed-in user's onboarding & training meeting: waiting for a call, or booked. */
export async function GET() {
  const sess = await getSession();
  if (!sess) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { data } = await db().from("leads").select("status, meeting_at, created_at").eq("user_id", sess.userId).eq("meeting_type", "onboarding").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!data) return Response.json({ onboarding: null }, { headers: { "Cache-Control": "no-store" } });
  const stage = data.status === "met" || data.status === "sold" ? "done" : data.status === "scheduled" && data.meeting_at ? "booked" : data.status === "not_relevant" ? "closed" : "waiting";
  return Response.json({ onboarding: { stage, meetingAt: data.meeting_at, since: data.created_at } }, { headers: { "Cache-Control": "no-store" } });
}
